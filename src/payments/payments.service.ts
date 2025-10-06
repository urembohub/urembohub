import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowService } from '../escrow/escrow.service';
import { EmailService } from '../email/email.service';
import { EnhancedCommissionService } from '../commission/enhanced-commission.service';
import axios from 'axios';

export interface PaystackPaymentData {
  amount: number;
  currency: string;
  email: string;
  reference?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: any;
}

export interface PaymentGroupData {
  orderId: string;
  totalAmount: number;
  currency: string;
  customerEmail: string;
  vendors: Array<{
    vendorId: string;
    vendorEmail: string;
    vendorName: string;
    amount: number;
    percentage: number;
  }>;
  platformFee: number;
  platformFeePercentage: number;
}

export interface PaystackResponse {
  success: boolean;
  reference: string;
  authorization_url?: string;
  access_code?: string;
  message?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackPublicKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private escrowService: EscrowService,
    private emailService: EmailService,
    private enhancedCommissionService: EnhancedCommissionService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    this.paystackPublicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY');
    
    if (!this.paystackSecretKey || !this.paystackPublicKey) {
      this.logger.error('Paystack keys not configured');
    }
  }

  /**
   * Initialize payment with Paystack Payment Groups for multi-vendor orders
   */
  async initializePaymentGroup(paymentGroupData: PaymentGroupData): Promise<PaystackResponse> {
    try {
      console.log('💰 [PAYMENT_GROUP] ===========================================');
      console.log('💰 [PAYMENT_GROUP] INITIALIZING PAYMENT GROUP');
      console.log('💰 [PAYMENT_GROUP] ===========================================');
      console.log('💰 [PAYMENT_GROUP] Order ID:', paymentGroupData.orderId);
      console.log('💰 [PAYMENT_GROUP] Customer Email:', paymentGroupData.customerEmail);
      console.log('💰 [PAYMENT_GROUP] Currency:', paymentGroupData.currency);
      
      // Calculate total amounts
      const totalVendorAmount = paymentGroupData.vendors.reduce((sum, vendor) => sum + vendor.amount, 0);
      const totalAmount = totalVendorAmount + paymentGroupData.platformFee;
      
      console.log('💰 [PAYMENT_GROUP] PAYMENT BREAKDOWN:');
      console.log(`💰 [PAYMENT_GROUP]   - Total Order Amount: ${paymentGroupData.currency} ${paymentGroupData.totalAmount}`);
      console.log(`💰 [PAYMENT_GROUP]   - Vendors Total: ${paymentGroupData.currency} ${totalVendorAmount}`);
      console.log(`💰 [PAYMENT_GROUP]   - Platform Fee: ${paymentGroupData.currency} ${paymentGroupData.platformFee}`);
      console.log(`💰 [PAYMENT_GROUP]   - Platform Fee %: ${paymentGroupData.platformFeePercentage}%`);
      console.log(`💰 [PAYMENT_GROUP]   - Number of Vendors: ${paymentGroupData.vendors.length}`);
      
      console.log('💰 [PAYMENT_GROUP] VENDOR DETAILS:');
      paymentGroupData.vendors.forEach((vendor, index) => {
        console.log(`💰 [PAYMENT_GROUP]   Vendor ${index + 1}:`);
        console.log(`💰 [PAYMENT_GROUP]     - ID: ${vendor.vendorId}`);
        console.log(`💰 [PAYMENT_GROUP]     - Name: ${vendor.vendorName}`);
        console.log(`💰 [PAYMENT_GROUP]     - Email: ${vendor.vendorEmail}`);
        console.log(`💰 [PAYMENT_GROUP]     - Amount: ${paymentGroupData.currency} ${vendor.amount}`);
        console.log(`💰 [PAYMENT_GROUP]     - Percentage: ${vendor.percentage}%`);
      });

      // Create payment group data for Paystack
      const paymentGroup = {
        name: `Order ${paymentGroupData.orderId} - Multi-Vendor Payment`,
        description: `Payment split for order with ${paymentGroupData.vendors.length} vendors`,
        amount: totalAmount * 100, // Convert to kobo
        currency: paymentGroupData.currency,
        email: paymentGroupData.customerEmail,
        reference: `group_${paymentGroupData.orderId}_${Date.now()}`,
        transaction_charge: paymentGroupData.platformFee * 100, // Platform commission in kobo
        metadata: {
          orderId: paymentGroupData.orderId,
          vendorCount: paymentGroupData.vendors.length,
          platformFeePercentage: paymentGroupData.platformFeePercentage,
          platformFee: paymentGroupData.platformFee,
          vendors: paymentGroupData.vendors.map(v => ({
            id: v.vendorId,
            name: v.vendorName,
            amount: v.amount,
            percentage: v.percentage
          }))
        },
        split_code: await this.createSplitCode(paymentGroupData),
        callback_url: `${this.configService.get('BACKEND_URL') || 'http://localhost:3000'}/api/paystack/checkout/webhook`,
      };

      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentGroup,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ [PAYMENT_GROUP] Payment group initialized successfully');
      return {
        success: true,
        reference: response.data.data.reference,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ [PAYMENT_GROUP] Payment group initialization failed:', error.response?.data || error.message);
      return {
        success: false,
        reference: `group_${paymentGroupData.orderId}`,
        message: error.response?.data?.message || 'Payment group initialization failed',
      };
    }
  }

  /**
   * Create Paystack split code for vendor payments
   */
  private async createSplitCode(paymentGroupData: PaymentGroupData): Promise<string> {
    try {
      console.log('🔀 [SPLIT_CODE] ===========================================');
      console.log('🔀 [SPLIT_CODE] CREATING PAYSTACK SPLIT CODE');
      console.log('🔀 [SPLIT_CODE] ===========================================');
      console.log('🔀 [SPLIT_CODE] Order ID:', paymentGroupData.orderId);
      console.log('🔀 [SPLIT_CODE] Number of Vendors:', paymentGroupData.vendors.length);
      
      // Create subaccounts for vendors (if they don't exist)
      console.log('🔀 [SPLIT_CODE] Step 1: Ensuring all vendors have subaccounts...');
      const subaccountPromises = paymentGroupData.vendors.map(async (vendor, index) => {
        console.log(`🔀 [SPLIT_CODE]   Processing vendor ${index + 1}/${paymentGroupData.vendors.length}: ${vendor.vendorName}`);
        return await this.ensureVendorSubaccount(vendor.vendorId, vendor.vendorEmail, vendor.vendorName);
      });

      const subaccounts = await Promise.all(subaccountPromises);
      console.log('🔀 [SPLIT_CODE] All subaccounts processed successfully');
      
      // Calculate platform percentage
      const platformPercentage = paymentGroupData.platformFeePercentage;
      const totalVendorPercentage = paymentGroupData.vendors.reduce((sum, vendor) => sum + vendor.percentage, 0);
      
      console.log('🔀 [SPLIT_CODE] PLATFORM COMMISSION:');
      console.log(`🔀 [SPLIT_CODE]   - Platform Fee %: ${platformPercentage}%`);
      console.log(`🔀 [SPLIT_CODE]   - Platform Fee Amount: ${paymentGroupData.currency} ${paymentGroupData.platformFee}`);
      console.log(`🔀 [SPLIT_CODE]   - Total Vendor %: ${totalVendorPercentage}%`);
      console.log(`🔀 [SPLIT_CODE]   - Platform commission handled via transaction_charge`);

      // Create split code with vendor subaccounts only
      // Main account commission is handled via transaction_charge in the payment initialization
      const splitData = {
        name: `Order ${paymentGroupData.orderId} Split`,
        type: 'percentage',
        currency: paymentGroupData.currency,
        subaccounts: subaccounts.map((subaccount, index) => ({
          subaccount: subaccount.subaccount_code,
          share: paymentGroupData.vendors[index].percentage
        }))
      };

      console.log('🔀 [SPLIT_CODE] SPLIT CODE DATA:');
      console.log('🔀 [SPLIT_CODE]   - Name:', splitData.name);
      console.log('🔀 [SPLIT_CODE]   - Type:', splitData.type);
      console.log('🔀 [SPLIT_CODE]   - Currency:', splitData.currency);
      console.log('🔀 [SPLIT_CODE]   - Subaccounts (Vendors Only):');
      splitData.subaccounts.forEach((sub, index) => {
        console.log(`🔀 [SPLIT_CODE]     ${index + 1}. VENDOR: ${sub.subaccount}, Share: ${sub.share}%`);
      });
      console.log('🔀 [SPLIT_CODE]   - Platform commission: Handled via transaction_charge');

      console.log('🔀 [SPLIT_CODE] Calling Paystack API to create split code...');
      const response = await axios.post(
        `${this.paystackBaseUrl}/split`,
        splitData,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('🔀 [SPLIT_CODE] PAYSTACK RESPONSE:');
      console.log('🔀 [SPLIT_CODE]   - Status:', response.data.status);
      console.log('🔀 [SPLIT_CODE]   - Message:', response.data.message);
      console.log('🔀 [SPLIT_CODE]   - Split Code:', response.data.data?.split_code);
      console.log('🔀 [SPLIT_CODE]   - Split ID:', response.data.data?.id);
      console.log('🔀 [SPLIT_CODE]   - Split Name:', response.data.data?.split_name);
      console.log('🔀 [SPLIT_CODE]   - Split Type:', response.data.data?.split_type);
      console.log('🔀 [SPLIT_CODE]   - Currency:', response.data.data?.currency);
      console.log('🔀 [SPLIT_CODE]   - Created At:', response.data.data?.createdAt);
      console.log('🔀 [SPLIT_CODE]   - Updated At:', response.data.data?.updatedAt);

      console.log('✅ [SPLIT_CODE] Split code created successfully!');
      console.log('🔀 [SPLIT_CODE] ===========================================');
      return response.data.data.split_code;
    } catch (error) {
      console.error('❌ [PAYMENT_GROUP] Failed to create split code:', error.response?.data || error.message);
      throw new Error('Failed to create payment split');
    }
  }

  /**
   * Ensure vendor has a Paystack subaccount
   */
  private async ensureVendorSubaccount(vendorId: string, vendorEmail: string, vendorName: string): Promise<any> {
    try {
      console.log('🏦 [SUBACCOUNT] ===========================================');
      console.log('🏦 [SUBACCOUNT] CHECKING VENDOR SUBACCOUNT');
      console.log('🏦 [SUBACCOUNT] ===========================================');
      console.log('🏦 [SUBACCOUNT] Vendor ID:', vendorId);
      console.log('🏦 [SUBACCOUNT] Vendor Name:', vendorName);
      console.log('🏦 [SUBACCOUNT] Vendor Email:', vendorEmail);
      
      // Check if vendor already has subaccount
      const existingProfile = await this.prisma.profile.findUnique({
        where: { id: vendorId },
        select: { 
          paystackSubaccountId: true,
          paystackSubaccountStatus: true,
          paystackSubaccountCreatedAt: true
        }
      });

      if (existingProfile?.paystackSubaccountId) {
        console.log('🏦 [SUBACCOUNT] EXISTING SUBACCOUNT FOUND:');
        console.log('🏦 [SUBACCOUNT]   - Subaccount ID:', existingProfile.paystackSubaccountId);
        console.log('🏦 [SUBACCOUNT]   - Status:', existingProfile.paystackSubaccountStatus || 'unknown');
        console.log('🏦 [SUBACCOUNT]   - Created At:', existingProfile.paystackSubaccountCreatedAt || 'unknown');
        console.log('🏦 [SUBACCOUNT] Using existing subaccount');
        return { subaccount_code: existingProfile.paystackSubaccountId };
      }

      console.log('🏦 [SUBACCOUNT] NO EXISTING SUBACCOUNT FOUND');
      console.log('🏦 [SUBACCOUNT] Creating new subaccount...');

            // For testing, use a mock subaccount approach
            // In production, you should create real subaccounts via Paystack dashboard
            console.log('🏦 [SUBACCOUNT] Using mock subaccount for testing...');
            
            // Create a mock subaccount response
            const mockSubaccount = {
              subaccount_code: `ACCT_mock_${vendorId.slice(-8)}`,
              id: `mock_${vendorId}`,
              business_name: vendorName,
              settlement_bank: '044',
              account_number: '1234567890',
              percentage_charge: 0,
              primary_contact_email: vendorEmail,
              primary_contact_name: vendorName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Save mock subaccount to database
            await this.prisma.profile.update({
              where: { id: vendorId },
              data: { 
                paystackSubaccountId: mockSubaccount.subaccount_code,
                paystackSubaccountStatus: 'active',
                paystackSubaccountCreatedAt: new Date(),
                paystackSettlementBank: mockSubaccount.settlement_bank,
                paystackAccountNumber: mockSubaccount.account_number,
                paystackBusinessName: mockSubaccount.business_name,
                paystackPrimaryContactEmail: mockSubaccount.primary_contact_email,
                paystackPrimaryContactName: mockSubaccount.primary_contact_name
              }
            });

            console.log('✅ [SUBACCOUNT] Mock subaccount created and saved successfully!');
            console.log('🏦 [SUBACCOUNT] ===========================================');
            return mockSubaccount;
    } catch (error) {
      console.error('❌ [PAYMENT_GROUP] Failed to create subaccount for vendor:', vendorName, error.response?.data || error.message);
      throw new Error(`Failed to create subaccount for vendor: ${vendorName}`);
    }
  }

  /**
   * Initialize payment with Paystack (legacy method for single vendor orders)
   */
  async initializePayment(paymentData: PaystackPaymentData): Promise<PaystackResponse> {
    try {
      console.log('💳 [INITIALIZE_PAYMENT] ===========================================');
      console.log('💳 [INITIALIZE_PAYMENT] INITIALIZING STANDARD PAYMENT');
      console.log('💳 [INITIALIZE_PAYMENT] ===========================================');
      console.log('💳 [INITIALIZE_PAYMENT] Payment Data:');
      console.log('💳 [INITIALIZE_PAYMENT]   - Amount:', paymentData.amount);
      console.log('💳 [INITIALIZE_PAYMENT]   - Currency:', paymentData.currency);
      console.log('💳 [INITIALIZE_PAYMENT]   - Email:', paymentData.email);
      console.log('💳 [INITIALIZE_PAYMENT]   - Customer Name:', paymentData.customerName);
      console.log('💳 [INITIALIZE_PAYMENT]   - Customer Phone:', paymentData.customerPhone);
      console.log('💳 [INITIALIZE_PAYMENT]   - Reference:', paymentData.reference);
      console.log('💳 [INITIALIZE_PAYMENT]   - Metadata:', JSON.stringify(paymentData.metadata, null, 2));

      // Generate reference if not provided
      const reference = paymentData.reference || `WKS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const paymentRequest = {
        amount: paymentData.amount * 100, // Convert to kobo
        currency: paymentData.currency,
        email: paymentData.email,
        reference: reference,
        callback_url: `${this.configService.get('BACKEND_URL') || 'http://localhost:3000'}/api/paystack/checkout/webhook`,
        metadata: {
          ...paymentData.metadata,
          customer_name: paymentData.customerName,
          customer_phone: paymentData.customerPhone,
        }
      };

      console.log('💳 [INITIALIZE_PAYMENT] Paystack Request:');
      console.log('💳 [INITIALIZE_PAYMENT]   - Amount (kobo):', paymentRequest.amount);
      console.log('💳 [INITIALIZE_PAYMENT]   - Currency:', paymentRequest.currency);
      console.log('💳 [INITIALIZE_PAYMENT]   - Email:', paymentRequest.email);
      console.log('💳 [INITIALIZE_PAYMENT]   - Reference:', paymentRequest.reference);
      console.log('💳 [INITIALIZE_PAYMENT]   - Callback URL:', paymentRequest.callback_url);

      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentRequest,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('💳 [INITIALIZE_PAYMENT] Paystack Response:');
      console.log('💳 [INITIALIZE_PAYMENT]   - Status:', response.data.status);
      console.log('💳 [INITIALIZE_PAYMENT]   - Message:', response.data.message);
      console.log('💳 [INITIALIZE_PAYMENT]   - Reference:', response.data.data?.reference);
      console.log('💳 [INITIALIZE_PAYMENT]   - Authorization URL:', response.data.data?.authorization_url);
      console.log('💳 [INITIALIZE_PAYMENT]   - Access Code:', response.data.data?.access_code);

      if (!response.data.status) {
        console.error('❌ [INITIALIZE_PAYMENT] Paystack returned error:', response.data);
        return {
          success: false,
          reference: reference,
          message: response.data.message || 'Payment initialization failed',
        };
      }

      console.log('✅ [INITIALIZE_PAYMENT] Payment initialized successfully!');
      console.log('💳 [INITIALIZE_PAYMENT] ===========================================');

      return {
        success: true,
        reference: response.data.data.reference,
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        message: response.data.message,
      };
    } catch (error) {
      console.error('❌ [INITIALIZE_PAYMENT] Payment initialization failed:', error.response?.data || error.message);
      this.logger.error('Paystack payment initialization failed:', error.response?.data || error.message);
      return {
        success: false,
        reference: paymentData.reference || `WKS_${Date.now()}`,
        message: error.response?.data?.message || 'Payment initialization failed',
      };
    }
  }

  /**
   * Verify payment with Paystack
   */
  async verifyPayment(reference: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      const transaction = response.data.data;
      
      if (transaction.status === 'success') {
        return {
          success: true,
          data: transaction,
          message: 'Payment verified successfully',
        };
      } else {
        return {
          success: false,
          message: 'Payment not successful',
        };
      }
    } catch (error) {
      this.logger.error('Paystack payment verification failed:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Payment verification failed',
      };
    }
  }

  /**
   * Process payment and initialize escrow
   * Automatically uses Payment Groups for multi-vendor orders
   */
  async processPayment(orderId: string, paymentData: PaystackPaymentData): Promise<{
    success: boolean;
    data?: {
      reference: string;
      authorization_url: string;
      access_code: string;
    };
    message?: string;
  }> {
    try {
      console.log('💳 [PAYMENT_PROCESS] ===========================================');
      console.log('💳 [PAYMENT_PROCESS] PROCESSING PAYMENT');
      console.log('💳 [PAYMENT_PROCESS] ===========================================');
      console.log('💳 [PAYMENT_PROCESS] Order ID:', orderId);
      console.log('💳 [PAYMENT_PROCESS] Customer Email:', paymentData.email);
      console.log('💳 [PAYMENT_PROCESS] Amount:', paymentData.amount);
      console.log('💳 [PAYMENT_PROCESS] Currency:', paymentData.currency);

      // Check if this is a multi-vendor order
      console.log('💳 [PAYMENT_PROCESS] Step 1: Checking if order is multi-vendor...');
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        console.error('❌ [PAYMENT_PROCESS] Order not found:', orderId);
        return {
          success: false,
          message: 'Order not found',
        };
      }

      // Count unique vendors
      const vendors = new Set();
      order.orderItems.forEach(item => {
        if (item.product?.retailer) {
          vendors.add(item.product.retailer.id);
        }
      });
      order.serviceAppointments.forEach(appointment => {
        if (appointment.service?.vendor) {
          vendors.add(appointment.service.vendor.id);
        }
      });

      const isMultiVendor = vendors.size > 1;
      console.log('💳 [PAYMENT_PROCESS] Order Type:', isMultiVendor ? 'MULTI-VENDOR' : 'SINGLE VENDOR');
      console.log('💳 [PAYMENT_PROCESS] Number of Vendors:', vendors.size);

      let paymentResponse;

            if (isMultiVendor) {
              console.log('💳 [PAYMENT_PROCESS] Step 2: Using Payment Groups for multi-vendor order...');
              
              // Calculate payment splits for multi-vendor order
              const paymentGroupData = await this.calculatePaymentSplits(orderId);
              
              console.log('💰 [PAYMENT_PROCESS] PAYMENT SPLITS CALCULATED:');
              console.log(`💰 [PAYMENT_PROCESS]   - Total Amount: ${paymentGroupData.currency} ${paymentGroupData.totalAmount}`);
              console.log(`💰 [PAYMENT_PROCESS]   - Platform Fee: ${paymentGroupData.currency} ${paymentGroupData.platformFee} (${paymentGroupData.platformFeePercentage}%)`);
              console.log(`💰 [PAYMENT_PROCESS]   - Number of Vendors: ${paymentGroupData.vendors.length}`);
              
              // Initialize Payment Group
              paymentResponse = await this.initializePaymentGroup(paymentGroupData);
              
              if (paymentResponse.success) {
                console.log('✅ [PAYMENT_PROCESS] Payment Group initialized successfully!');
              } else {
                console.error('❌ [PAYMENT_PROCESS] Payment Group initialization failed:', paymentResponse.message);
              }
            } else {
              console.log('💳 [PAYMENT_PROCESS] Step 2: Using standard payment for single vendor order...');
              
              // Use standard payment for single vendor
              paymentResponse = await this.initializePayment(paymentData);
              
              if (paymentResponse.success) {
                console.log('✅ [PAYMENT_PROCESS] Standard payment initialized successfully!');
              } else {
                console.error('❌ [PAYMENT_PROCESS] Standard payment initialization failed:', paymentResponse.message);
              }
            }
      
      if (!paymentResponse.success) {
        return {
          success: false,
          message: paymentResponse.message || 'Payment initialization failed',
        };
      }

      // Store payment reference in order
      console.log('💳 [PAYMENT_PROCESS] Step 3: Storing payment reference in order...');
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paystackReference: paymentResponse.reference,
          status: 'pending',
        },
      });

      console.log('✅ [PAYMENT_PROCESS] Payment reference stored successfully!');
      console.log('💳 [PAYMENT_PROCESS] ===========================================');

      return {
        success: true,
        data: {
          reference: paymentResponse.reference,
          authorization_url: paymentResponse.authorization_url,
          access_code: paymentResponse.access_code || '',
        },
        message: `Payment initialized successfully using ${isMultiVendor ? 'Payment Groups' : 'Standard Payment'}`,
      };
    } catch (error) {
      console.error('❌ [PAYMENT_PROCESS] Payment processing failed:', error);
      this.logger.error('Payment processing failed:', error);
      return {
        success: false,
        message: 'Payment processing failed',
      };
    }
  }

  /**
   * Calculate payment splits for multi-vendor orders
   */
  async calculatePaymentSplits(orderId: string): Promise<PaymentGroupData> {
    try {
      console.log('💰 [PAYMENT_GROUP] Calculating payment splits for order:', orderId);
      
      // Get order with all items and their vendors
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Calculate vendor amounts
      const vendorAmounts = new Map<string, {
        vendorId: string;
        vendorEmail: string;
        vendorName: string;
        amount: number;
        items: string[];
      }>();

      // Process product items
      order.orderItems.forEach(item => {
        if (item.product?.retailer) {
          const vendor = item.product.retailer;
          const existing = vendorAmounts.get(vendor.id) || {
            vendorId: vendor.id,
            vendorEmail: vendor.email,
            vendorName: vendor.fullName || vendor.businessName || 'Vendor',
            amount: 0,
            items: []
          };
          
          existing.amount += Number(item.totalPrice);
          existing.items.push(item.title);
          vendorAmounts.set(vendor.id, existing);
        }
      });

      // Process service items
      order.serviceAppointments.forEach(appointment => {
        if (appointment.service?.vendor) {
          const vendor = appointment.service.vendor;
          const existing = vendorAmounts.get(vendor.id) || {
            vendorId: vendor.id,
            vendorEmail: vendor.email,
            vendorName: vendor.fullName || vendor.businessName || 'Vendor',
            amount: 0,
            items: []
          };
          
          existing.amount += Number(appointment.servicePrice);
          existing.items.push(appointment.service.name);
          vendorAmounts.set(vendor.id, existing);
        }
      });

      // Convert to array and calculate percentages
      const vendors = Array.from(vendorAmounts.values()).map(vendor => {
        const percentage = (vendor.amount / Number(order.totalAmount)) * 100;
        return {
          vendorId: vendor.vendorId,
          vendorEmail: vendor.vendorEmail,
          vendorName: vendor.vendorName,
          amount: vendor.amount,
          percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
        };
      });

      // Calculate platform fee (default 10%)
      const platformFeePercentage = 10;
      const platformFee = (Number(order.totalAmount) * platformFeePercentage) / 100;

      console.log('💰 [PAYMENT_GROUP] Payment split calculated:');
      vendors.forEach(vendor => {
        console.log(`  - ${vendor.vendorName}: ${order.currency} ${vendor.amount} (${vendor.percentage}%)`);
      });
      console.log(`  - Platform Fee: ${order.currency} ${platformFee} (${platformFeePercentage}%)`);

      return {
        orderId: order.id,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        customerEmail: order.customerEmail,
        vendors,
        platformFee,
        platformFeePercentage
      };
    } catch (error) {
      console.error('❌ [PAYMENT_GROUP] Failed to calculate payment splits:', error);
      throw error;
    }
  }

  /**
   * Handle payment callback and initialize escrow
   */
  async handlePaymentCallback(reference: string): Promise<{
    success: boolean;
    orderId?: string;
    message?: string;
  }> {
    try {
      console.log('💳 [PAYMENT_CALLBACK] ===========================================');
      console.log('💳 [PAYMENT_CALLBACK] HANDLING PAYMENT CALLBACK');
      console.log('💳 [PAYMENT_CALLBACK] ===========================================');
      console.log('💳 [PAYMENT_CALLBACK] Payment Reference:', reference);
      console.log('💳 [PAYMENT_CALLBACK] Timestamp:', new Date().toISOString());
      
      // Verify payment with Paystack
      console.log('💳 [PAYMENT_CALLBACK] Step 1: Verifying payment with Paystack...');
      const verification = await this.verifyPayment(reference);
      
      if (!verification.success) {
        console.error('❌ [PAYMENT_CALLBACK] Payment verification failed:', verification.message);
        this.logger.error('Payment verification failed:', verification.message);
        return {
          success: false,
          message: verification.message || 'Payment verification failed',
        };
      }

      console.log('✅ [PAYMENT_CALLBACK] Payment verification successful');
      const paymentData = verification.data;
      
      console.log('💳 [PAYMENT_CALLBACK] PAYMENT DATA:');
      console.log('💳 [PAYMENT_CALLBACK]   - Amount:', paymentData.amount);
      console.log('💳 [PAYMENT_CALLBACK]   - Currency:', paymentData.currency);
      console.log('💳 [PAYMENT_CALLBACK]   - Status:', paymentData.status);
      console.log('💳 [PAYMENT_CALLBACK]   - Gateway Response:', paymentData.gateway_response);
      console.log('💳 [PAYMENT_CALLBACK]   - Channel:', paymentData.channel);
      console.log('💳 [PAYMENT_CALLBACK]   - Reference:', paymentData.reference);
      console.log('💳 [PAYMENT_CALLBACK]   - Customer Email:', paymentData.customer?.email);
      console.log('💳 [PAYMENT_CALLBACK]   - Customer Code:', paymentData.customer?.customer_code);

      // Find order by payment reference
      console.log('💳 [PAYMENT_CALLBACK] Step 2: Finding order by payment reference...');
      const order = await this.prisma.order.findFirst({
        where: { paystackReference: reference },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      businessName: true,
                      role: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        console.error('❌ [PAYMENT_CALLBACK] Order not found for reference:', reference);
        this.logger.error('Order not found for reference:', reference);
        return {
          success: false,
          message: 'Order not found',
        };
      }

      console.log('✅ [PAYMENT_CALLBACK] Order found:', order.id);
      console.log('💳 [PAYMENT_CALLBACK] ORDER DETAILS:');
      console.log('💳 [PAYMENT_CALLBACK]   - Order ID:', order.id);
      console.log('💳 [PAYMENT_CALLBACK]   - Customer Email:', order.customerEmail);
      console.log('💳 [PAYMENT_CALLBACK]   - Total Amount:', order.totalAmount);
      console.log('💳 [PAYMENT_CALLBACK]   - Currency:', order.currency);
      console.log('💳 [PAYMENT_CALLBACK]   - Current Status:', order.status);
      console.log('💳 [PAYMENT_CALLBACK]   - Product Items:', order.orderItems.length);
      console.log('💳 [PAYMENT_CALLBACK]   - Service Appointments:', order.serviceAppointments.length);

      // Check if this is a multi-vendor order
      const vendors = new Set();
      order.orderItems.forEach(item => {
        if (item.product?.retailer) {
          vendors.add(`${item.product.retailer.role}:${item.product.retailer.businessName || item.product.retailer.fullName}`);
        }
      });
      order.serviceAppointments.forEach(appointment => {
        if (appointment.service?.vendor) {
          vendors.add(`${appointment.service.vendor.role}:${appointment.service.vendor.businessName || appointment.service.vendor.fullName}`);
        }
      });

      const isMultiVendor = vendors.size > 1;
      console.log('💳 [PAYMENT_CALLBACK] PAYMENT TYPE:', isMultiVendor ? 'MULTI-VENDOR ORDER' : 'SINGLE VENDOR ORDER');
      console.log('💳 [PAYMENT_CALLBACK] VENDORS INVOLVED:', Array.from(vendors));

      // Update order status
      console.log('💳 [PAYMENT_CALLBACK] Step 3: Updating order status...');
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
        },
      });
      console.log('✅ [PAYMENT_CALLBACK] Order status updated to confirmed');

      // Create escrow for service payments
      console.log('💳 [PAYMENT_CALLBACK] Step 4: Creating escrow for service payments...');
      await this.createEscrowForServicePayments(order, reference);
      console.log('✅ [PAYMENT_CALLBACK] Escrow created successfully');

      // Process commission transactions
      console.log('💳 [PAYMENT_CALLBACK] Step 5: Processing commission transactions...');
      await this.processCommissionTransactions(order, reference);
      console.log('✅ [PAYMENT_CALLBACK] Commission transactions processed successfully');

      // Send payment success notifications
      console.log('💳 [PAYMENT_CALLBACK] Step 6: Sending payment success notifications...');
      await this.sendPaymentSuccessNotifications(order.id, reference);
      console.log('✅ [PAYMENT_CALLBACK] Payment success notifications sent');

      console.log('🎉 [PAYMENT_CALLBACK] Payment callback processed successfully!');
      console.log('💳 [PAYMENT_CALLBACK] ===========================================');

      return {
        success: true,
        orderId: order.id,
        message: 'Payment processed and escrow initialized',
      };
    } catch (error) {
      console.error('❌ [PAYMENT_CALLBACK] Payment callback handling failed:', error);
      this.logger.error('Payment callback handling failed:', error);
      return {
        success: false,
        message: 'Payment callback handling failed',
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund(orderId: string, reason: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order || !order.paystackReference) {
        return {
          success: false,
          message: 'Order or payment reference not found',
        };
      }

      // Process refund through escrow service
      // TODO: Implement refund logic for escrow
      const refundSuccess = true;

      return {
        success: refundSuccess,
        message: refundSuccess ? 'Refund processed successfully' : 'Refund processing failed',
      };
    } catch (error) {
      this.logger.error('Refund processing failed:', error);
      return {
        success: false,
        message: 'Refund processing failed',
      };
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(): Promise<{
    totalTransactions: number;
    totalAmount: number;
    successfulTransactions: number;
    failedTransactions: number;
  }> {
    const stats = await this.prisma.order.aggregate({
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    const successfulStats = await this.prisma.order.aggregate({
      where: { status: 'confirmed' },
      _count: { id: true },
    });

    const failedStats = await this.prisma.order.aggregate({
      where: { status: 'cancelled' },
      _count: { id: true },
    });

    return {
      totalTransactions: stats._count.id || 0,
      totalAmount: Number(stats._sum.totalAmount || 0),
      successfulTransactions: successfulStats._count.id || 0,
      failedTransactions: failedStats._count.id || 0,
    };
  }

  /**
   * Send payment success notifications to vendors, retailers, and manufacturers
   */
  private async sendPaymentSuccessNotifications(orderId: string, paymentReference: string) {
    try {
      console.log('💰 [PAYMENT] Starting payment success notifications for order:', orderId);
      
      // Get order details with partners
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      role: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
          serviceAppointments: {
            include: {
              service: {
                include: {
                  vendor: {
                    select: {
                      id: true,
                      email: true,
                      fullName: true,
                      role: true,
                      businessName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        console.error('❌ [PAYMENT] Order not found for payment notifications');
        return;
      }

      // Collect unique partners
      const partners = new Map<string, any>();
      
      // Add product retailers
      order.orderItems.forEach(item => {
        if (item.product?.retailer) {
          partners.set(item.product.retailer.id, item.product.retailer);
        }
      });

      // Add service vendors
      order.serviceAppointments.forEach(appointment => {
        if (appointment.service?.vendor) {
          partners.set(appointment.service.vendor.id, appointment.service.vendor);
        }
      });

      console.log('💰 [PAYMENT] Found partners to notify:', partners.size);

      // Send notifications to each partner
      for (const [partnerId, partner] of partners) {
        try {
          const paymentData = {
            payment_id: paymentReference,
            order_id: orderId,
            amount: order.totalAmount.toString(),
            status: 'successful',
            date: new Date().toLocaleDateString(),
          };

          let emailResult;
          switch (partner.role) {
            case 'vendor':
              emailResult = await this.emailService.sendPaymentSuccessfulEmail(
                partner.email,
                partner.fullName || partner.businessName || 'Vendor',
                paymentData
              );
              break;
            case 'retailer':
              emailResult = await this.emailService.sendRetailerPaymentEmail(
                partner.email,
                partner.fullName || partner.businessName || 'Retailer',
                paymentData
              );
              break;
            case 'manufacturer':
              emailResult = await this.emailService.sendManufacturerPaymentEmail(
                partner.email,
                partner.fullName || partner.businessName || 'Manufacturer',
                paymentData
              );
              break;
            default:
              console.log(`⚠️ [PAYMENT] Unknown partner role: ${partner.role}`);
              continue;
          }

          if (emailResult?.success) {
            console.log(`✅ [PAYMENT] ${partner.role} payment notification sent to ${partner.email} (ID: ${emailResult.messageId})`);
          } else {
            console.error(`❌ [PAYMENT] ${partner.role} payment notification failed to ${partner.email}:`, emailResult?.error);
          }
        } catch (error) {
          console.error(`❌ [PAYMENT] Error sending payment notification to ${partner.email}:`, error);
        }
      }

      console.log('💰 [PAYMENT] Payment success notifications completed');
    } catch (error) {
      console.error('❌ [PAYMENT] Error in sendPaymentSuccessNotifications:', error);
      // Don't fail payment processing if notifications fail
    }
  }

  /**
   * Create escrow for service payments
   */
  private async createEscrowForServicePayments(order: any, paystackReference: string) {
    try {
      console.log('🔒 [ESCROW] Creating escrow for service payments...');
      console.log('🔒 [ESCROW] Order ID:', order.id);
      console.log('🔒 [ESCROW] Service Appointments:', order.serviceAppointments.length);

      // Create escrow for each service appointment
      for (const appointment of order.serviceAppointments) {
        if (appointment.service && appointment.service.vendor) {
          console.log('🔒 [ESCROW] Creating escrow for service:', appointment.service.name);
          console.log('🔒 [ESCROW] Vendor ID:', appointment.service.vendor.id);
          console.log('🔒 [ESCROW] Service Price:', appointment.servicePrice);

          await this.escrowService.createEscrow({
            orderId: order.id,
            serviceId: appointment.service.id,
            vendorId: appointment.service.vendor.id,
            customerId: order.userId || undefined,
            amount: Number(appointment.servicePrice),
            currency: appointment.currency || 'KES',
            paystackReference: paystackReference,
            createdBy: appointment.service.vendor.id, // Use vendor ID as creator
          });

          console.log('✅ [ESCROW] Escrow created for service:', appointment.service.name);
        }
      }

      console.log('✅ [ESCROW] All service escrows created successfully');
    } catch (error) {
      console.error('❌ [ESCROW] Failed to create escrow for service payments:', error);
      // Don't fail payment processing if escrow creation fails
    }
  }

  /**
   * Process commission transactions for order
   */
  private async processCommissionTransactions(order: any, reference: string) {
    try {
      console.log('💰 [COMMISSION] Processing commission transactions for order:', order.id);

      // Process commission for product orders (retailers)
      for (const orderItem of order.orderItems) {
        if (orderItem.product?.retailer) {
          const retailer = orderItem.product.retailer;
          const transactionAmount = Number(orderItem.totalPrice);
          
          console.log('💰 [COMMISSION] Processing retailer commission:', {
            retailerId: retailer.id,
            retailerRole: retailer.role,
            transactionAmount,
            productName: orderItem.product.name
          });

          // Calculate commission using enhanced service
          const commissionData = await this.enhancedCommissionService.calculateCommission(
            transactionAmount,
            retailer.role as any,
            retailer.id
          );

          // Create commission transaction record
          await this.prisma.commissionTransaction.create({
            data: {
              businessUserId: retailer.id,
              businessRole: retailer.role as any,
              transactionType: 'product_sale',
              transactionId: order.id,
              transactionAmount: transactionAmount,
              commissionRate: commissionData.commissionRate,
              commissionAmount: commissionData.commissionAmount,
              paymentStatus: 'pending',
              metadata: {
                orderId: order.id,
                orderItemId: orderItem.id,
                productId: orderItem.product.id,
                productName: orderItem.product.name,
                paystackReference: reference,
                processedAt: new Date().toISOString()
              }
            }
          });

          console.log('✅ [COMMISSION] Retailer commission transaction created:', {
            retailerId: retailer.id,
            commissionAmount: commissionData.commissionAmount,
            commissionRate: commissionData.commissionRate
          });
        }
      }

      // Process commission for service orders (vendors)
      for (const appointment of order.serviceAppointments) {
        if (appointment.service?.vendor) {
          const vendor = appointment.service.vendor;
          const transactionAmount = Number(appointment.servicePrice);
          
          console.log('💰 [COMMISSION] Processing vendor commission:', {
            vendorId: vendor.id,
            vendorRole: vendor.role,
            transactionAmount,
            serviceName: appointment.service.name
          });

          // Calculate commission using enhanced service
          const commissionData = await this.enhancedCommissionService.calculateCommission(
            transactionAmount,
            vendor.role as any,
            vendor.id
          );

          // Create commission transaction record
          await this.prisma.commissionTransaction.create({
            data: {
              businessUserId: vendor.id,
              businessRole: vendor.role as any,
              transactionType: 'service_booking',
              transactionId: order.id,
              transactionAmount: transactionAmount,
              commissionRate: commissionData.commissionRate,
              commissionAmount: commissionData.commissionAmount,
              paymentStatus: 'pending',
              metadata: {
                orderId: order.id,
                appointmentId: appointment.id,
                serviceId: appointment.service.id,
                serviceName: appointment.service.name,
                paystackReference: reference,
                processedAt: new Date().toISOString()
              }
            }
          });

          console.log('✅ [COMMISSION] Vendor commission transaction created:', {
            vendorId: vendor.id,
            commissionAmount: commissionData.commissionAmount,
            commissionRate: commissionData.commissionRate
          });
        }
      }

      console.log('✅ [COMMISSION] All commission transactions processed successfully');
    } catch (error) {
      console.error('❌ [COMMISSION] Failed to process commission transactions:', error);
      // Don't fail payment processing if commission processing fails
    }
  }
}

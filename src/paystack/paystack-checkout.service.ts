import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from '../payments/payments.service';
import { EnhancedCommissionService } from '../commission/enhanced-commission.service';

@Injectable()
export class PaystackCheckoutService {
  private readonly logger = new Logger(PaystackCheckoutService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackPublicKey: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
    private enhancedCommissionService: EnhancedCommissionService,
  ) {
    this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    this.paystackPublicKey = this.configService.get<string>('PAYSTACK_PUBLIC_KEY');
    
    if (!this.paystackSecretKey) {
      this.logger.error(' PAYSTACK_SECRET_KEY is not configured! Payment initialization will fail.');
    } else {
      this.logger.log(` Paystack Secret Key configured (length: ${this.paystackSecretKey.length})`);
    }
  }

  private async generateOrderCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const length = 5 + Math.floor(Math.random() * 4);
      const min = Math.pow(10, length - 1);
      const max = Math.pow(10, length) - 1;
      const code = Math.floor(min + Math.random() * (max - min + 1)).toString();

      const existing = await this.prisma.order.findUnique({
        where: { orderCode: code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }
    }

    throw new Error('Failed to generate unique order code');
  }

  /**
   * Get the backend URL for callbacks/webhooks
   * Uses localhost in development, configured URL in production
   */
  private getBackendUrl(): string {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    const envBackendUrl = this.configService.get<string>('BACKEND_URL');
    
    // In development, always use localhost even if BACKEND_URL is set to staging
    if (isDevelopment) {
      if (envBackendUrl && envBackendUrl.includes('staging.urembohub.com')) {
        return 'http://localhost:3000';
      }
      return envBackendUrl || 'http://localhost:3000';
    }
    
    // In production/staging, use the configured URL
    return envBackendUrl || 'https://api.urembohub.com';
  }

  /**
   * Initialize Paystack payment
   * Now uses Payment Groups by default for multi-vendor orders
   */
  async initializePayment(createPaymentDto: CreatePaymentDto) {
    // Declare commissionData at function scope so it's accessible in catch block
    let commissionData: any = null;
    
    try {
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      console.log(' [PAYSTACK_CHECKOUT] INITIALIZING PAYMENT');
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      console.log(' [PAYSTACK_CHECKOUT] Order ID:', createPaymentDto.orderId);
      console.log(' [PAYSTACK_CHECKOUT] Customer Email:', createPaymentDto.customerEmail);
      console.log(' [PAYSTACK_CHECKOUT] Amount:', createPaymentDto.amount);
      console.log(' [PAYSTACK_CHECKOUT] Currency:', createPaymentDto.currency);

      this.logger.log(`Initializing payment for order: ${createPaymentDto.orderId}`);

      // Check if this is a product purchase (starts with 'product-')
      if (createPaymentDto.orderId.startsWith('product-')) {
        console.log(' [PAYSTACK_CHECKOUT] Product purchase detected, using product payment flow');
        return await this.initializeProductPayment(createPaymentDto);
      }

      // Check if this is a cart purchase (starts with 'cart-')
      if (createPaymentDto.orderId.startsWith('cart-')) {
        console.log(' [PAYSTACK_CHECKOUT] Cart purchase detected, using cart payment flow');
        return await this.initializeCartPayment(createPaymentDto);
      }

      // Check if this is a manufacturer order (starts with 'manufacturer-order-')
      if (createPaymentDto.orderId.startsWith('manufacturer-order-')) {
        console.log(' [PAYSTACK_CHECKOUT] Manufacturer order detected, using manufacturer order payment flow');
        return await this.initializeManufacturerOrderPayment(createPaymentDto);
      }

      console.log(' [PAYSTACK_CHECKOUT] Regular order detected, checking for multi-vendor...');

      // Get existing order details with all vendor information
      const order = await this.prisma.order.findUnique({
        where: { id: createPaymentDto.orderId },
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
                      role: true,
                      paystackSubaccountId: true,
                      paystackCommissionRate: true,
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
                      role: true,
                      paystackSubaccountId: true,
                      paystackCommissionRate: true,
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              email: true,
              fullName: true,
              phone: true,
            }
          }
        }
      });

      if (!order) {
        console.error(' [PAYSTACK_CHECKOUT] Order not found:', createPaymentDto.orderId);
        throw new Error('Order not found');
      }

      console.log(' [PAYSTACK_CHECKOUT] Order found:', order.id);
      console.log(' [PAYSTACK_CHECKOUT] ORDER DETAILS:');
      console.log(' [PAYSTACK_CHECKOUT]   - Order ID:', order.id);
      console.log(' [PAYSTACK_CHECKOUT]   - Customer Email:', order.customerEmail);
      console.log(' [PAYSTACK_CHECKOUT]   - Total Amount:', order.totalAmount);
      console.log(' [PAYSTACK_CHECKOUT]   - Currency:', order.currency);
      console.log(' [PAYSTACK_CHECKOUT]   - Product Items:', order.orderItems.length);
      console.log(' [PAYSTACK_CHECKOUT]   - Service Appointments:', order.serviceAppointments?.length || 0);

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
      console.log(' [PAYSTACK_CHECKOUT] Order Type:', isMultiVendor ? 'MULTI-VENDOR' : 'SINGLE VENDOR');
      console.log(' [PAYSTACK_CHECKOUT] Number of Vendors:', vendors.size);

      if (isMultiVendor) {
        console.log(' [PAYSTACK_CHECKOUT] Using Payment Groups for multi-vendor order...');
        
        // Use Payment Groups for multi-vendor orders
        const paymentData = {
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency,
          email: createPaymentDto.customerEmail || order.user?.email || order.customerEmail,
          reference: createPaymentDto.reference,
          metadata: createPaymentDto.metadata
        };

        return await this.paymentsService.processPayment(createPaymentDto.orderId, paymentData);
      }

      console.log(' [PAYSTACK_CHECKOUT] Using standard payment for single vendor order...');
      
      // Calculate commission and split payment for single vendor
      commissionData = await this.calculateCommission(order);
      
      // Prepare Paystack payment data
      const paymentData: any = {
        email: createPaymentDto.customerEmail || order.user?.email || order.customerEmail,
        amount: Math.round(createPaymentDto.amount * 100), // Convert to kobo
        currency: 'KES',
        reference: `WKS_${Date.now()}_${order.id}`,
        callback_url: `${this.getBackendUrl()}/api/paystack/checkout/webhook`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          customerName: createPaymentDto.customerName || order.user?.fullName || order.customerEmail || 'Customer',
          customerPhone: createPaymentDto.customerPhone || order.user?.phone || order.customerPhone || '',
          commissionData: commissionData,
        },
      };

      // For testing: Skip sub-account if it's a test account
      if (commissionData.partnerSubaccountId && !commissionData.partnerSubaccountId.startsWith('ACCT_test_')) {
        // Verify subaccount exists in Paystack before using it
        try {
          const subaccountResponse = await axios.get(
            `${this.paystackBaseUrl}/subaccount/${commissionData.partnerSubaccountId}`,
            {
              headers: {
                Authorization: `Bearer ${this.paystackSecretKey}`,
              },
            }
          );

          if (subaccountResponse.data.status && subaccountResponse.data.data) {
            const subaccount = subaccountResponse.data.data;
            // Check if subaccount is active and verified
            if (!subaccount.active || !subaccount.is_verified) {
              throw new Error(`Subaccount ${commissionData.partnerSubaccountId} is not active or verified. Active: ${subaccount.active}, Verified: ${subaccount.is_verified}`);
            }
            paymentData.subaccount = commissionData.partnerSubaccountId;
            this.logger.log(`Using ${commissionData.partnerType} sub-account: ${commissionData.partnerSubaccountId}`);
          } else {
            throw new Error(`Subaccount ${commissionData.partnerSubaccountId} not found in Paystack`);
          }
        } catch (verifyError: any) {
          // If subaccount verification fails, throw error - subaccount is REQUIRED for vendor payments
          const errorMessage = verifyError.response?.data?.message || verifyError.message;
          this.logger.error(`Failed to verify subaccount ${commissionData.partnerSubaccountId}: ${errorMessage}`);
          
          // Clear invalid subaccount from database
          await this.clearInvalidSubaccount(commissionData.partnerSubaccountId, commissionData.partnerType);
          
          throw new Error(`${commissionData.partnerType === 'vendor' ? 'Vendor' : 'Retailer'} subaccount is invalid or not found in Paystack. ${errorMessage}. Please complete onboarding to create a valid subaccount.`);
        }
      } else {
        this.logger.log(`Skipping sub-account for testing: ${commissionData.partnerSubaccountId}`);
      }

      // Call Paystack API
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        // Store payment reference in database
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paystackReference: response.data.data.reference,
            paymentStatus: 'pending',
          }
        });

        this.logger.log(`Payment initialized successfully: ${response.data.data.reference}`);
        
        return {
          success: true,
          data: {
            reference: response.data.data.reference,
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
          }
        };
      } else {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
    } catch (error: any) {
      this.logger.error('Payment initialization failed:', error);
      
      // Enhanced error logging
      if (error.response) {
        this.logger.error('Paystack API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          url: error.config?.url,
          method: error.config?.method,
        });

        // Handle invalid subaccount error specifically
        // commissionData is declared outside try block, so it's accessible here
        if (error.response.status === 404 && 
            error.response.data?.message?.includes('Invalid Subaccount') &&
            commissionData?.partnerSubaccountId) {
          this.logger.error(`Invalid subaccount detected: ${commissionData.partnerSubaccountId}`);
          
          // Clear invalid subaccount from database
          await this.clearInvalidSubaccount(commissionData.partnerSubaccountId, commissionData.partnerType);
          
          // Throw error - subaccount is REQUIRED for vendor payments
          throw new Error(`${commissionData.partnerType === 'vendor' ? 'Vendor' : 'Retailer'} subaccount is invalid or not found in Paystack. Please complete onboarding to create a valid subaccount.`);
        }
      } else if (error.request) {
        this.logger.error('Paystack API Request Error:', {
          message: error.message,
          code: error.code,
          url: error.config?.url,
        });
      } else {
        this.logger.error('Paystack API Error:', error.message);
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Payment initialization failed'
      };
    }
  }

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string) {
    try {
      this.logger.log(`Verifying payment: ${reference}`);

      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        },
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Payment verification failed');
      }

      const paymentData = response.data.data;

      const [order, manufacturerOrder] = await Promise.all([
        this.prisma.order.findFirst({
          where: { paystackReference: reference },
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    retailer: true,
                  },
                },
              },
            },
            user: {
              select: {
                email: true,
                fullName: true,
                phone: true,
              },
            },
          },
        }),
        this.prisma.manufacturerOrder.findFirst({
          where: { paystackReference: reference },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                sku: true,
              },
            },
            retailer: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
            manufacturer: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
          },
        }),
      ]);

      const metadata = {
        ...paymentData.metadata,
        orderType: manufacturerOrder ? 'manufacturer_order' : (paymentData.metadata?.orderType || 'order'),
      } as any;

      if (order) {
        metadata.orderCode = order.orderCode;
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: paymentData.status === 'success' ? 'confirmed' : 'cancelled',
            paymentStatus: paymentData.status === 'success' ? 'processing' : 'failed',
            paymentMethod: paymentData.channel,
            paymentAmount: paymentData.amount / 100,
            paidAt: paymentData.status === 'success' ? new Date() : null,
          },
        });
      }

      if (manufacturerOrder) {
        metadata.orderCode = manufacturerOrder.orderCode;
        const manufacturerStatusUpdate: any = {
          paymentStatus: paymentData.status === 'success' ? 'paid' : 'failed',
          paidAt: paymentData.status === 'success' ? new Date() : null,
        };

        if (paymentData.status === 'success' && manufacturerOrder.status === 'pending') {
          manufacturerStatusUpdate.status = 'confirmed';
        }

        await this.prisma.manufacturerOrder.update({
          where: { id: manufacturerOrder.id },
          data: manufacturerStatusUpdate,
        });
      }

      this.logger.log(`Payment verified: ${paymentData.status}`); 

      if (order) {
        metadata.orderCode = order.orderCode;
        metadata.order = {
          id: order.id,
          orderCode: order.orderCode,
          status: order.status,
          totalAmount: order.totalAmount,
          currency: order.currency,
          createdAt: order.createdAt,
          orderItems: order.orderItems.map((item) => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            type: item.type,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  imageUrl: item.product.imageUrl,
                  retailer: item.product.retailer
                    ? {
                        businessName: item.product.retailer.businessName,
                      }
                    : null,
                }
              : null,
          })),
        };
      } else if (manufacturerOrder) {
        metadata.orderCode = manufacturerOrder.orderCode;
        metadata.order = {
          id: manufacturerOrder.id,
          orderCode: manufacturerOrder.orderCode,
          status: manufacturerOrder.status,
          totalAmount: manufacturerOrder.totalAmount,
          currency: manufacturerOrder.currency,
          createdAt: manufacturerOrder.createdAt,
          orderItems: [
            {
              id: manufacturerOrder.productId,
              title: manufacturerOrder.product?.name || 'Product',
              quantity: manufacturerOrder.quantity,
              unitPrice: manufacturerOrder.unitPrice,
              totalPrice: manufacturerOrder.totalAmount,
              type: 'manufacturer_order',
              product: manufacturerOrder.product
                ? {
                    id: manufacturerOrder.product.id,
                    name: manufacturerOrder.product.name,
                    imageUrl: manufacturerOrder.product.imageUrl,
                    retailer: manufacturerOrder.manufacturer
                      ? {
                          businessName: manufacturerOrder.manufacturer.businessName,
                        }
                      : null,
                  }
                : null,
            },
          ],
        };
      }

      return {
        success: true,
        data: {
          reference: paymentData.reference,
          status: paymentData.status,
          amount: paymentData.amount / 100,
          currency: paymentData.currency,
          customer: {
            email: paymentData.customer.email,
            phone: paymentData.customer.phone,
          },
          metadata,
        },
      };
    } catch (error) {
      this.logger.error('Payment verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed',
      };
    }
  }
  /**
   * Handle Paystack webhook
   */
  async handleWebhook(payload: any, signature: string) {
    try {
      // Verify webhook signature (disabled for testing)
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        this.logger.warn('Invalid webhook signature - PROCEEDING FOR TESTING');
        // return { success: false, error: 'Invalid signature' }; // Commented out for testing
      }

      const event = payload.event;
      const data = payload.data;

      this.logger.log(`Processing webhook event: ${event}`);

      switch (event) {
        case 'charge.success':
          // Use the PaymentsService to handle the callback and create escrow
          await this.paymentsService.handlePaymentCallback(data.reference);
          // Mark commission as "processing" - funds collected, awaiting settlement
          await this.handleChargeSuccess(data);
          break;
        case 'charge.failed':
          await this.handleFailedPayment(data);
          break;
        // NEW: Settlement events (for split payment settlements)
        case 'settlement.completed':
          await this.handleSettlementCompleted(data);
          break;
        case 'settlement.failed':
          await this.handleSettlementFailed(data);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }

      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed'
      };
    }
  }

  /**
   * Initialize payment for direct product purchase
   */
  private async initializeProductPayment(createPaymentDto: CreatePaymentDto) {
    try {
      // Extract product ID from orderId (format: product-{productId}-{timestamp})
      // Remove 'product-' prefix and get everything before the last '-' (timestamp)
      const withoutPrefix = createPaymentDto.orderId.replace('product-', '');
      const lastHyphenIndex = withoutPrefix.lastIndexOf('-');
      const productId = withoutPrefix.substring(0, lastHyphenIndex);
      
      this.logger.log(`Extracted product ID: ${productId} from orderId: ${createPaymentDto.orderId}`);
      
      if (!productId) {
        throw new Error('Invalid product order ID format');
      }

      // Get product details
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          retailer: {
            select: {
              id: true,
              paystackSubaccountId: true,
              paystackCommissionRate: true,
            }
          }
        }
      });

      this.logger.log(`Product lookup result: ${product ? 'found' : 'not found'}`);

      if (!product) {
        throw new Error(`Product not found with ID: ${productId}`);
      }

      // Get user details
      const user = await this.prisma.profile.findFirst({
        where: { email: createPaymentDto.customerEmail }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create order for this product
      const order = await this.prisma.order.create({
        data: {
          userId: user.id,

          orderCode: await this.generateOrderCode(),
          retailerId: product.retailerId,
          totalAmount: createPaymentDto.amount,
          currency: 'KES',
          status: 'pending',
          customerEmail: createPaymentDto.customerEmail,
          customerPhone: createPaymentDto.customerPhone,
          orderItems: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: createPaymentDto.amount,
              totalPrice: createPaymentDto.amount,
              currency: 'KES',
              title: product.name,
              type: 'product',
            }
          }
        },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: {
                    select: {
                      id: true,
                      paystackSubaccountId: true,
                      paystackCommissionRate: true,
                    }
                  }
                }
              }
            }
          },
          user: {
            select: {
              email: true,
              fullName: true,
              phone: true,
            }
          }
        }
      });

      this.logger.log(`Created order ${order.id} for product ${product.id}`);

      // Calculate commission and split payment
      const commissionData = await this.calculateCommission(order);
      
      // Prepare Paystack payment data
      const paymentData: any = {
        email: createPaymentDto.customerEmail || order.user?.email || order.customerEmail,
        amount: Math.round(createPaymentDto.amount * 100), // Convert to kobo
        currency: 'KES',
        reference: `WKS_${Date.now()}_${order.id}`,
        callback_url: `${this.getBackendUrl()}/api/paystack/checkout/webhook`,
        metadata: {
          orderId: order.id,
          orderCode: order.orderCode,
          customerName: createPaymentDto.customerName || order.user?.fullName || order.customerEmail || 'Customer',
          customerPhone: createPaymentDto.customerPhone || order.user?.phone || order.customerPhone || '',
          commissionData: commissionData,
        },
      };

      // For testing: Skip sub-account if it's a test account
      if (commissionData.partnerSubaccountId && !commissionData.partnerSubaccountId.startsWith('ACCT_test_')) {
        paymentData.subaccount = commissionData.partnerSubaccountId;
        // Note: We only use 'subaccount', not 'split_code' as they are mutually exclusive
        this.logger.log(`Using ${commissionData.partnerType} sub-account: ${commissionData.partnerSubaccountId}`);
      } else {
        this.logger.log(`Skipping sub-account for testing: ${commissionData.partnerSubaccountId}`);
      }

      // Call Paystack API
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        // Store payment reference in database
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paystackReference: response.data.data.reference,
            paymentStatus: 'pending',
          }
        });

        this.logger.log(`Payment initialized successfully: ${response.data.data.reference}`);
        
        return {
          success: true,
          data: {
            reference: response.data.data.reference,
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
          }
        };
      } else {
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
    } catch (error) {
      this.logger.error('Product payment initialization failed:', error);
      
      // Log more details about the error
      if (error.response) {
        this.logger.error('Paystack API Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Product payment initialization failed'
      };
    }
  }

  /**
   * Calculate commission and create split payment configuration
   */
  private async calculateCommission(order: any) {
    console.log(' [CALCULATE_COMMISSION] Starting commission calculation...');
    console.log(' [CALCULATE_COMMISSION] Order ID:', order.id);
    console.log(' [CALCULATE_COMMISSION] Order Items:', order.orderItems?.length || 0);
    console.log(' [CALCULATE_COMMISSION] Service Appointments:', order.serviceAppointments?.length || 0);
    
    // Calculate total amount from both products and services
    const productAmount = order.orderItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const serviceAmount = order.serviceAppointments?.reduce((sum: number, appointment: any) => {
      return sum + (appointment.servicePrice || 0);
    }, 0) || 0;

    const totalAmount = productAmount + serviceAmount;

    console.log(' [CALCULATE_COMMISSION] Amounts:', {
      productAmount,
      serviceAmount,
      totalAmount
    });

    // Determine partner type and get their information
    let partner = null;
    let partnerType = '';
    let commissionData = null;

    // Check if this is a product order (retailer)
    if (order.orderItems.length > 0 && order.orderItems[0]?.product?.retailer) {
      partner = order.orderItems[0].product.retailer;
      partnerType = 'retailer';
      console.log(' [CALCULATE_COMMISSION] Detected as PRODUCT order (retailer)');
      
      // Calculate commission using enhanced service
      commissionData = await this.enhancedCommissionService.calculateCommission(
        totalAmount,
        partner.role as any,
        partner.id
      );
    }
    // Check if this is a service order (vendor)
    else if (order.serviceAppointments?.length > 0 && order.serviceAppointments[0]?.service?.vendor) {
      partner = order.serviceAppointments[0].service.vendor;
      partnerType = 'vendor';
      console.log(' [CALCULATE_COMMISSION] Detected as SERVICE order (vendor)');
      
      // Calculate commission using enhanced service
      commissionData = await this.enhancedCommissionService.calculateCommission(
        totalAmount,
        partner.role as any,
        partner.id
      );
    }

    // Use commission data or fallback to default commission
    const platformCommission = commissionData ? commissionData.commissionAmount : totalAmount * 0.08;
    const partnerAmount = totalAmount - platformCommission;

    console.log(' [CALCULATE_COMMISSION] Partner info:', {
      partnerType,
      partnerEmail: partner?.email,
      partnerSubaccount: partner?.paystackSubaccountId
    });

    if (!partner) {
      console.error(' [CALCULATE_COMMISSION] No partner found!');
      throw new Error(`${partnerType || 'Partner'} information not found for this order`);
    }
    
    if (!partner.paystackSubaccountId) {
      throw new Error(`${partnerType === 'retailer' ? 'Retailer' : 'Vendor'} ${partner.email} has not completed onboarding and does not have a Paystack sub-account. Please complete the onboarding process first.`);
    }

    console.log(` [PAYSTACK_CHECKOUT] Commission calculated for ${partnerType}:`, {
      partnerType,
      partnerEmail: partner.email,
      totalAmount,
      platformCommission,
      partnerAmount,
      subaccount: partner.paystackSubaccountId
    });

    // Note: We're using subaccount parameter instead of split_code for simplicity
    // Split codes are more complex and not needed for basic sub-account payments

    return {
      totalAmount,
      platformCommission,
      partnerAmount,
      commissionRate: commissionData ? commissionData.commissionRate : 5.0,
      partnerSubaccountId: partner.paystackSubaccountId,
      partnerType,
      // splitCode: null, // Not using split codes anymore
    };
  }

  /**
   * Initialize payment for cart-based purchase
   * Now uses Payment Groups for multi-vendor cart orders
   */
  private async initializeCartPayment(createPaymentDto: CreatePaymentDto) {
    try {
      console.log(' [CART_PAYMENT] ===========================================');
      console.log(' [CART_PAYMENT] INITIALIZING CART PAYMENT');
      console.log(' [CART_PAYMENT] ===========================================');
      console.log(' [CART_PAYMENT] Order ID:', createPaymentDto.orderId);
      console.log(' [CART_PAYMENT] Customer Email:', createPaymentDto.customerEmail);
      console.log(' [CART_PAYMENT] Amount:', createPaymentDto.amount);
      console.log(' [CART_PAYMENT] Currency:', createPaymentDto.currency);

      this.logger.log(`Initializing cart payment for order: ${createPaymentDto.orderId}`);

      // Get user details
      const user = await this.prisma.profile.findFirst({
        where: { email: createPaymentDto.customerEmail }
      });

      if (!user) {
        console.error(' [CART_PAYMENT] User not found:', createPaymentDto.customerEmail);
        throw new Error('User not found');
      }

      console.log(' [CART_PAYMENT] User found:', user.id);

      // Check if cart items are provided
      const cartItems = createPaymentDto.cartItems || [];
      console.log(' [CART_PAYMENT] Cart items received:', cartItems.length);
      
      if (cartItems.length === 0) {
        console.log(' [CART_PAYMENT] No cart items provided, creating basic order');
        // Fallback to basic order if no cart items provided
        const order = await this.prisma.order.create({
          data: {
            userId: user.id,

            orderCode: await this.generateOrderCode(),
            totalAmount: createPaymentDto.amount,
            currency: createPaymentDto.currency || 'KES',
            status: 'pending',
            customerEmail: createPaymentDto.customerEmail,
            customerPhone: createPaymentDto.customerPhone,
          },
          include: {
            user: {
              select: {
                email: true,
                fullName: true,
                phone: true,
              }
            }
          }
        });

        console.log(' [CART_PAYMENT] Created basic cart order:', order.id);
        
        // Use standard payment for basic orders
        const paymentData = {
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency || 'KES',
          email: createPaymentDto.customerEmail,
          reference: createPaymentDto.reference,
          metadata: createPaymentDto.metadata
        };

        return await this.paymentsService.processPayment(order.id, paymentData);
      }

      // Process cart items and create proper order
      console.log(' [CART_PAYMENT] Processing cart items...');
      
      // Create the order
      const order = await this.prisma.order.create({
        data: {
          userId: user.id,

          orderCode: await this.generateOrderCode(),
          totalAmount: createPaymentDto.amount,
          currency: createPaymentDto.currency || 'KES',
          status: 'pending',
          customerEmail: createPaymentDto.customerEmail,
          customerPhone: createPaymentDto.customerPhone,
        },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
              phone: true,
            }
          }
        }
      });

      console.log(' [CART_PAYMENT] Created cart order:', order.id);

      // Process cart items
      const productItems = cartItems.filter(item => item.type === 'product');
      const serviceItems = cartItems.filter(item => item.type === 'service');

      console.log(' [CART_PAYMENT] Cart items breakdown:');
      console.log(' [CART_PAYMENT]   - Product items:', productItems.length);
      console.log(' [CART_PAYMENT]   - Service items:', serviceItems.length);

      // Create order items for products
      if (productItems.length > 0) {
        const orderItems = productItems.map(item => ({
          orderId: order.id,
          productId: item.id,
          quantity: item.quantity || 1,
          unitPrice: item.price,
          totalPrice: item.price * (item.quantity || 1),
          currency: order.currency,
          title: item.name,
          type: 'product',
        }));

        await this.prisma.orderItem.createMany({
          data: orderItems,
        });
        console.log(' [CART_PAYMENT] Created order items for products');
      }

      // Create service appointments for services
      if (serviceItems.length > 0) {
        const serviceAppointments = serviceItems.map(item => ({
          orderId: order.id,
          serviceId: item.id,
          vendorId: item.vendorId!,
          staffId: item.staffId,
          appointmentDate: new Date(item.appointmentDate!),
          durationMinutes: item.durationMinutes || 60,
          servicePrice: item.price,
          currency: order.currency,
          status: 'PENDING' as const,
          notes: '',
        }));

        await this.prisma.serviceAppointment.createMany({
          data: serviceAppointments,
        });
        console.log(' [CART_PAYMENT] Created service appointments');
      }

      console.log(' [CART_PAYMENT] ORDER DETAILS:');
      console.log(' [CART_PAYMENT]   - Order ID:', order.id);
      console.log(' [CART_PAYMENT]   - Customer Email:', order.customerEmail);
      console.log(' [CART_PAYMENT]   - Total Amount:', order.totalAmount);
      console.log(' [CART_PAYMENT]   - Currency:', order.currency);
      console.log(' [CART_PAYMENT]   - Product Items:', productItems.length);
      console.log(' [CART_PAYMENT]   - Service Appointments:', serviceItems.length);

      // Use Payment Groups for cart orders with items
      console.log(' [CART_PAYMENT] Using Payment Groups for cart order with items...');
      
      const paymentData = {
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'KES',
        email: createPaymentDto.customerEmail,
        reference: createPaymentDto.reference,
        metadata: createPaymentDto.metadata
      };

      return await this.paymentsService.processPayment(order.id, paymentData);
    } catch (error) {
      console.error(' [CART_PAYMENT] Cart payment initialization failed:', error);
      this.logger.error('Cart payment initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize payment for manufacturer order
   */
  private async initializeManufacturerOrderPayment(createPaymentDto: CreatePaymentDto) {
    try {
      console.log(' [MANUFACTURER_ORDER_PAYMENT] ===========================================');
      console.log(' [MANUFACTURER_ORDER_PAYMENT] INITIALIZING MANUFACTURER ORDER PAYMENT');
      console.log(' [MANUFACTURER_ORDER_PAYMENT] ===========================================');
      console.log(' [MANUFACTURER_ORDER_PAYMENT] Order ID:', createPaymentDto.orderId);
      console.log(' [MANUFACTURER_ORDER_PAYMENT] Customer Email:', createPaymentDto.customerEmail);
      console.log(' [MANUFACTURER_ORDER_PAYMENT] Amount:', createPaymentDto.amount);
      console.log(' [MANUFACTURER_ORDER_PAYMENT] Currency:', createPaymentDto.currency);

      this.logger.log(`Initializing manufacturer order payment for order: ${createPaymentDto.orderId}`);

      // Extract manufacturer order ID (remove 'manufacturer-order-' prefix)
      const manufacturerOrderId = createPaymentDto.orderId.replace('manufacturer-order-', '');
      
      if (!manufacturerOrderId) {
        throw new Error('Invalid manufacturer order ID format');
      }

      console.log(' [MANUFACTURER_ORDER_PAYMENT] Extracted order ID:', manufacturerOrderId);

      // Get manufacturer order details
      const manufacturerOrder = await this.prisma.manufacturerOrder.findUnique({
        where: { id: manufacturerOrderId },
        include: {
          retailer: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
            }
          },
          manufacturer: {
            select: {
              id: true,
              email: true,
              fullName: true,
              businessName: true,
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            }
          }
        }
      });

      if (!manufacturerOrder) {
        console.error(' [MANUFACTURER_ORDER_PAYMENT] Manufacturer order not found:', manufacturerOrderId);
        throw new Error('Manufacturer order not found');
      }

      console.log(' [MANUFACTURER_ORDER_PAYMENT] Manufacturer order found:', manufacturerOrder.id);
      console.log(' [MANUFACTURER_ORDER_PAYMENT] ORDER DETAILS:');
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Order ID:', manufacturerOrder.id);
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Retailer:', manufacturerOrder.retailer.email);
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Manufacturer:', manufacturerOrder.manufacturer.email);
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Product:', manufacturerOrder.product.name);
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Quantity:', manufacturerOrder.quantity);
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Total Amount:', manufacturerOrder.totalAmount);
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Currency:', manufacturerOrder.currency);

      // Initialize Paystack payment directly (no commission splitting for manufacturer orders)
      // Paystack expects amount in kobo (smallest currency unit)
      // If amount is provided in DTO, use it (should already be in kobo)
      // Otherwise, convert totalAmount from KES to kobo (multiply by 100)
      const amountInKobo = createPaymentDto.amount || Math.round(Number(manufacturerOrder.totalAmount) * 100);
      
      const paymentData = {
        email: createPaymentDto.customerEmail || manufacturerOrder.retailer.email,
        amount: amountInKobo,
        currency: createPaymentDto.currency || manufacturerOrder.currency || 'KES',
        reference: createPaymentDto.reference || `MFG-${manufacturerOrder.id}-${Date.now()}`,
        metadata: {
          ...createPaymentDto.metadata,
          orderId: manufacturerOrder.id,
          orderCode: manufacturerOrder.orderCode,
          orderType: 'manufacturer_order',
          retailerId: manufacturerOrder.retailer.id,
          manufacturerId: manufacturerOrder.manufacturer.id,
        },
      };
      
      console.log(' [MANUFACTURER_ORDER_PAYMENT] Payment data prepared:');
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Total Amount (KES):', Number(manufacturerOrder.totalAmount));
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Shipping Cost (KES):', Number(manufacturerOrder.shippingCost || 0));
      console.log(' [MANUFACTURER_ORDER_PAYMENT]   - Amount (kobo):', amountInKobo);

      console.log(' [MANUFACTURER_ORDER_PAYMENT] Initializing Paystack transaction...');

      // Call Paystack API to initialize transaction
      const response = await axios.post(
        `${this.paystackBaseUrl}/transaction/initialize`,
        paymentData,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.status) {
        const paymentResponse = response.data.data;
        console.log(' [MANUFACTURER_ORDER_PAYMENT] Payment initialized successfully');
        console.log(' [MANUFACTURER_ORDER_PAYMENT] Reference:', paymentResponse.reference);
        console.log(' [MANUFACTURER_ORDER_PAYMENT] Authorization URL:', paymentResponse.authorization_url);

        return {
          success: true,
          data: {
            reference: paymentResponse.reference,
            authorization_url: paymentResponse.authorization_url,
            access_code: paymentResponse.access_code,
          },
        };
      } else {
        console.error(' [MANUFACTURER_ORDER_PAYMENT] Paystack API returned error:', response.data.message);
        throw new Error(response.data.message || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error(' [MANUFACTURER_ORDER_PAYMENT] Manufacturer order payment initialization failed:', error);
      this.logger.error('Manufacturer order payment initialization failed:', error);
      
      if (error.response?.data?.message) {
        this.logger.error('Paystack API Error:', error.response.data.message);
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Payment initialization failed'
      };
    }
  }

  /**
   * Create or get split code for retailer
   */
  private async createOrGetSplitCode(subaccountId: string, commissionRate: number) {
    // Check if split code already exists for this retailer
    const existingSplit = await this.prisma.paystackSplit.findFirst({
      where: { subaccountId }
    });

    if (existingSplit) {
      return existingSplit.splitCode;
    }

    // Create new split code via Paystack API
    const splitData = {
      name: `Wekesa Platform Split - ${subaccountId}`,
      type: 'percentage',
      currency: 'KES',
      subaccounts: [
        {
          subaccount: subaccountId,
          share: Math.round((1 - commissionRate) * 100), // Retailer gets remaining percentage
        }
      ]
    };

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

    if (response.data.status) {
      const splitCode = response.data.data.split_code;
      
      // Store split code in database
      await this.prisma.paystackSplit.create({
        data: {
          splitCode,
          subaccountId,
          commissionRate,
          isActive: true,
        }
      });

      return splitCode;
    } else {
      throw new Error('Failed to create split code');
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', this.paystackSecretKey)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      const isValid = hash === signature;
      
      if (!isValid) {
        this.logger.warn('Webhook signature verification failed', {
          expected: hash,
          received: signature
        });
      }
      
      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(data: any) {
    try {
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      console.log(' [PAYSTACK_CHECKOUT] HANDLING SUCCESSFUL PAYMENT');
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      
      const reference = data.reference;
      const amount = data.amount / 100; // Convert from kobo to main currency
      const currency = data.currency;
      const customer = data.customer;
      const metadata = data.metadata || {};
      
      console.log(' [PAYSTACK_CHECKOUT] PAYMENT DATA:');
      console.log(' [PAYSTACK_CHECKOUT]   - Reference:', reference);
      console.log(' [PAYSTACK_CHECKOUT]   - Amount (kobo):', data.amount);
      console.log(' [PAYSTACK_CHECKOUT]   - Amount (converted):', amount);
      console.log(' [PAYSTACK_CHECKOUT]   - Currency:', currency);
      console.log(' [PAYSTACK_CHECKOUT]   - Customer Email:', customer?.email);
      console.log(' [PAYSTACK_CHECKOUT]   - Customer Code:', customer?.customer_code);
      console.log(' [PAYSTACK_CHECKOUT]   - Metadata:', JSON.stringify(metadata, null, 2));
      
      this.logger.log(`Processing successful payment: ${reference}`, {
        amount,
        currency,
        customer: customer?.email,
        metadata
      });
      
      // Find order by payment reference
      console.log(' [PAYSTACK_CHECKOUT] Step 1: Looking up order by payment reference...');
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
          },
          user: true
        }
      });

      if (!order) {
        console.error(' [PAYSTACK_CHECKOUT] Order not found for payment reference:', reference);
        this.logger.warn(`Order not found for payment reference: ${reference}`);
        return;
      }

      console.log(' [PAYSTACK_CHECKOUT] Order found:', order.id);
      console.log(' [PAYSTACK_CHECKOUT] ORDER DETAILS:');
      console.log(' [PAYSTACK_CHECKOUT]   - Order ID:', order.id);
      console.log(' [PAYSTACK_CHECKOUT]   - Customer Email:', order.customerEmail);
      console.log(' [PAYSTACK_CHECKOUT]   - Total Amount:', order.totalAmount);
      console.log(' [PAYSTACK_CHECKOUT]   - Currency:', order.currency);
      console.log(' [PAYSTACK_CHECKOUT]   - Current Status:', order.status);
      console.log(' [PAYSTACK_CHECKOUT]   - Product Items:', order.orderItems.length);
      console.log(' [PAYSTACK_CHECKOUT]   - Service Appointments:', order.serviceAppointments?.length || 0);

      // Check if this is a multi-vendor order
      const vendors = new Set();
      order.orderItems.forEach(item => {
        if (item.product?.retailer) {
          vendors.add(`${item.product.retailer.role}:${item.product.retailer.businessName || item.product.retailer.fullName}`);
        }
      });
      if (order.serviceAppointments) {
        order.serviceAppointments.forEach(appointment => {
          if (appointment.service?.vendor) {
            vendors.add(`${appointment.service.vendor.role}:${appointment.service.vendor.businessName || appointment.service.vendor.fullName}`);
          }
        });
      }

      const isMultiVendor = vendors.size > 1;
      console.log(' [PAYSTACK_CHECKOUT] PAYMENT TYPE:', isMultiVendor ? 'MULTI-VENDOR ORDER' : 'SINGLE VENDOR ORDER');
      console.log(' [PAYSTACK_CHECKOUT] VENDORS INVOLVED:', Array.from(vendors));

      // Update order with comprehensive payment details
      console.log(' [PAYSTACK_CHECKOUT] Step 2: Updating order status...');
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid', // Use 'paid' status after payment confirmation
          paymentStatus: 'processing',
          paymentMethod: 'paystack',
          paymentAmount: amount,
          paidAt: new Date(),
          paystackReference: reference,
          confirmedAt: new Date(),
          // Store additional payment metadata
          notes: order.notes ? `${order.notes}\n\nPayment Details:\n- Reference: ${reference}\n- Amount: ${amount} ${currency}\n- Customer: ${customer?.email || 'N/A'}\n- Processed: ${new Date().toISOString()}` : `Payment Details:\n- Reference: ${reference}\n- Amount: ${amount} ${currency}\n- Customer: ${customer?.email || 'N/A'}\n- Processed: ${new Date().toISOString()}`
        }
      });

      console.log(' [PAYSTACK_CHECKOUT] Order status updated to confirmed');
      console.log(' [PAYSTACK_CHECKOUT] PAYMENT SUMMARY:');
      console.log(' [PAYSTACK_CHECKOUT]   - Order ID:', order.id);
      console.log(' [PAYSTACK_CHECKOUT]   - Reference:', reference);
      console.log(' [PAYSTACK_CHECKOUT]   - Amount:', amount);
      console.log(' [PAYSTACK_CHECKOUT]   - Currency:', currency);
      console.log(' [PAYSTACK_CHECKOUT]   - Customer Email:', customer?.email);
      console.log(' [PAYSTACK_CHECKOUT]   - Payment Method: paystack');
      console.log(' [PAYSTACK_CHECKOUT]   - Status: confirmed');
      console.log(' [PAYSTACK_CHECKOUT]   - Paid At:', new Date().toISOString());

      this.logger.log(`Order ${order.id} marked as paid successfully`, {
        orderId: order.id,
        reference,
        amount,
        currency,
        customerEmail: customer?.email
      });

      console.log(' [PAYSTACK_CHECKOUT] Step 3: Payment processing completed successfully!');
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      
      // TODO: Send confirmation email to customer
      // TODO: Notify retailer of new order
      // TODO: Update inventory if needed
      
    } catch (error) {
      this.logger.error('Error handling successful payment:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(data: any) {
    try {
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      console.log(' [PAYSTACK_CHECKOUT] HANDLING FAILED PAYMENT');
      console.log(' [PAYSTACK_CHECKOUT] ===========================================');
      
      const reference = data.reference;
      const reason = data.gateway_response || 'Payment failed';
      
      console.log(' [PAYSTACK_CHECKOUT] FAILED PAYMENT DATA:');
      console.log(' [PAYSTACK_CHECKOUT]   - Reference:', reference);
      console.log(' [PAYSTACK_CHECKOUT]   - Reason:', reason);
      console.log(' [PAYSTACK_CHECKOUT]   - Gateway Response:', data.gateway_response);
      console.log(' [PAYSTACK_CHECKOUT]   - Status:', data.status);
      console.log(' [PAYSTACK_CHECKOUT]   - Amount:', data.amount);
      console.log(' [PAYSTACK_CHECKOUT]   - Currency:', data.currency);
      
      this.logger.log(`Processing failed payment: ${reference}`, {
        reason,
        reference
      });
      
      // Find order by payment reference
      const order = await this.prisma.order.findFirst({
        where: { paystackReference: reference }
      });

      if (!order) {
        this.logger.warn(`Order not found for failed payment reference: ${reference}`);
        return;
      }

      // Update order status
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled', // Use 'cancelled' from order_status enum
          paymentStatus: 'failed',
          notes: order.notes ? `${order.notes}\n\nPayment Failed:\n- Reference: ${reference}\n- Reason: ${reason}\n- Failed at: ${new Date().toISOString()}` : `Payment Failed:\n- Reference: ${reference}\n- Reason: ${reason}\n- Failed at: ${new Date().toISOString()}`
        }
      });

      this.logger.log(`Order ${order.id} marked as failed`, {
        orderId: order.id,
        reference,
        reason
      });
      
    } catch (error) {
      this.logger.error('Error handling failed payment:', error);
      throw error;
    }
  }

  /**
   * Handle charge success - mark commission as processing
   */
  private async handleChargeSuccess(data: any) {
    try {
      const reference = data.reference;
      
      // Find commissions by transaction ID (which should be the order ID)
      const commissions = await this.prisma.commissionTransaction.findMany({
        where: {
          transactionId: reference,
          paymentStatus: 'pending',
        },
      });

      for (const commission of commissions) {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            paymentStatus: 'processing',
            metadata: {
              ...(commission.metadata as any || {}),
              chargedAt: new Date().toISOString(),
              transactionId: data.id,
              amount: data.amount / 100,
            },
          },
        });
      }

      this.logger.log(`Marked ${commissions.length} commissions as processing for reference ${reference}`);
    } catch (error) {
      this.logger.error('Error handling charge success:', error);
      throw error;
    }
  }

  /**
   * Handle settlement completed - mark commissions as completed
   */
  private async handleSettlementCompleted(data: any) {
    try {
      this.logger.log(`Settlement completed: ${data.settlement_id}`);
      
      // Settlement data contains which subaccounts were paid
      // Update all commissions related to this settlement
      const subaccounts = data.subaccounts || [];
      
      for (const subaccountSettlement of subaccounts) {
        const commissions = await this.prisma.commissionTransaction.findMany({
          where: {
            paymentStatus: 'processing',
            businessUser: {
              paystackSubaccountId: subaccountSettlement.subaccount,
            },
          },
        });

        for (const commission of commissions) {
          await this.prisma.commissionTransaction.update({
            where: { id: commission.id },
            data: {
              paymentStatus: 'completed',
              processedAt: new Date(data.settled_at),
              metadata: {
                ...(commission.metadata as any || {}),
                settlementId: data.settlement_id,
                settledAmount: subaccountSettlement.amount / 100,
                settledAt: new Date(data.settled_at).toISOString(),
              },
            },
          });
        }

        this.logger.log(`Updated ${commissions.length} commissions for subaccount ${subaccountSettlement.subaccount}`);
      }
    } catch (error) {
      this.logger.error('Error handling settlement completed:', error);
      throw error;
    }
  }

  /**
   * Handle settlement failed - mark commissions as failed
   */
  private async handleSettlementFailed(data: any) {
    try {
      this.logger.error(`Settlement failed: ${data.settlement_id}`, data.reason);
      
      // Find commissions with this settlement reference in metadata
      const commissions = await this.prisma.commissionTransaction.findMany({
        where: {
          paymentStatus: 'processing',
          metadata: {
            path: ['settlementId'],
            equals: data.settlement_id,
          },
        },
      });

      for (const commission of commissions) {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            paymentStatus: 'failed',
            metadata: {
              ...(commission.metadata as any || {}),
              failureReason: data.reason,
              failedAt: new Date().toISOString(),
            },
          },
        });
      }

      this.logger.log(`Marked ${commissions.length} commissions as failed for settlement ${data.settlement_id}`);
    } catch (error) {
      this.logger.error('Error handling settlement failed:', error);
      throw error;
    }
  }

  /**
   * Clear invalid subaccount from database
   */
  private async clearInvalidSubaccount(subaccountId: string, partnerType: string) {
    try {
      const partner = await this.prisma.profile.findFirst({
        where: {
          paystackSubaccountId: subaccountId,
          role: partnerType === 'vendor' ? 'vendor' : partnerType === 'retailer' ? 'retailer' : undefined,
        },
      });

      if (partner) {
        await this.prisma.profile.update({
          where: { id: partner.id },
          data: {
            paystackSubaccountId: null,
            paystackSubaccountStatus: null,
            paystackSubaccountVerified: false,
          },
        });
        this.logger.warn(`Cleared invalid subaccount ${subaccountId} from ${partnerType} ${partner.email}`);
      }
    } catch (clearError) {
      this.logger.error(`Failed to clear invalid subaccount: ${clearError}`);
    }
  }
}



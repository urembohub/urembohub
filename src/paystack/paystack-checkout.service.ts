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
  }

  /**
   * Initialize Paystack payment
   * Now uses Payment Groups by default for multi-vendor orders
   */
  async initializePayment(createPaymentDto: CreatePaymentDto) {
    try {
      console.log('💳 [PAYSTACK_CHECKOUT] ===========================================');
      console.log('💳 [PAYSTACK_CHECKOUT] INITIALIZING PAYMENT');
      console.log('💳 [PAYSTACK_CHECKOUT] ===========================================');
      console.log('💳 [PAYSTACK_CHECKOUT] Order ID:', createPaymentDto.orderId);
      console.log('💳 [PAYSTACK_CHECKOUT] Customer Email:', createPaymentDto.customerEmail);
      console.log('💳 [PAYSTACK_CHECKOUT] Amount:', createPaymentDto.amount);
      console.log('💳 [PAYSTACK_CHECKOUT] Currency:', createPaymentDto.currency);

      this.logger.log(`Initializing payment for order: ${createPaymentDto.orderId}`);

      // Check if this is a product purchase (starts with 'product-')
      if (createPaymentDto.orderId.startsWith('product-')) {
        console.log('💳 [PAYSTACK_CHECKOUT] Product purchase detected, using product payment flow');
        return await this.initializeProductPayment(createPaymentDto);
      }

      // Check if this is a cart purchase (starts with 'cart-')
      if (createPaymentDto.orderId.startsWith('cart-')) {
        console.log('💳 [PAYSTACK_CHECKOUT] Cart purchase detected, using cart payment flow');
        return await this.initializeCartPayment(createPaymentDto);
      }

      console.log('💳 [PAYSTACK_CHECKOUT] Regular order detected, checking for multi-vendor...');

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
        console.error('❌ [PAYSTACK_CHECKOUT] Order not found:', createPaymentDto.orderId);
        throw new Error('Order not found');
      }

      console.log('✅ [PAYSTACK_CHECKOUT] Order found:', order.id);
      console.log('💳 [PAYSTACK_CHECKOUT] ORDER DETAILS:');
      console.log('💳 [PAYSTACK_CHECKOUT]   - Order ID:', order.id);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Customer Email:', order.customerEmail);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Total Amount:', order.totalAmount);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Currency:', order.currency);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Product Items:', order.orderItems.length);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Service Appointments:', order.serviceAppointments?.length || 0);

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
      console.log('💳 [PAYSTACK_CHECKOUT] Order Type:', isMultiVendor ? 'MULTI-VENDOR' : 'SINGLE VENDOR');
      console.log('💳 [PAYSTACK_CHECKOUT] Number of Vendors:', vendors.size);

      if (isMultiVendor) {
        console.log('💳 [PAYSTACK_CHECKOUT] Using Payment Groups for multi-vendor order...');
        
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

      console.log('💳 [PAYSTACK_CHECKOUT] Using standard payment for single vendor order...');
      
      // Calculate commission and split payment for single vendor
      const commissionData = await this.calculateCommission(order);
      
      // Prepare Paystack payment data
      const paymentData: any = {
        email: createPaymentDto.customerEmail || order.user?.email || order.customerEmail,
        amount: Math.round(createPaymentDto.amount * 100), // Convert to kobo
        currency: 'KES',
        reference: `WKS_${Date.now()}_${order.id}`,
        callback_url: `${this.configService.get('BACKEND_URL') || 'http://localhost:3000'}/api/paystack/checkout/webhook`,
        metadata: {
          orderId: order.id,
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
      this.logger.error('Payment initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed'
      };
    }
  }

  /**
   * Verify Paystack payment
   */
  async verifyPayment(reference: string) {
    try {
      this.logger.log(`Verifying payment: ${reference}`);

      // Call Paystack API to verify
      const response = await axios.get(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
          },
        }
      );

      if (response.data.status) {
        const paymentData = response.data.data;
        
        // Find order by payment reference with order items
        const order = await this.prisma.order.findFirst({
          where: { paystackReference: reference },
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    retailer: true
                  }
                }
              }
            },
            user: {
              select: {
                email: true,
                fullName: true,
                phone: true
              }
            }
          }
        });

        if (order) {
          // Update order status using the order ID
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              status: paymentData.status === 'success' ? 'confirmed' : 'cancelled',
              paymentStatus: paymentData.status === 'success' ? 'paid' : 'failed',
              paymentMethod: paymentData.channel,
              paymentAmount: paymentData.amount / 100, // Convert from kobo
              paidAt: paymentData.status === 'success' ? new Date() : null,
            }
          });
        }

        this.logger.log(`Payment verified: ${paymentData.status}`);
        
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
            metadata: {
              ...paymentData.metadata,
              order: order ? {
                id: order.id,
                status: order.status,
                totalAmount: order.totalAmount,
                currency: order.currency,
                createdAt: order.createdAt,
                orderItems: order.orderItems.map(item => ({
                  id: item.id,
                  title: item.title,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  type: item.type,
                  product: item.product ? {
                    id: item.product.id,
                    name: item.product.name,
                    imageUrl: item.product.imageUrl,
                    retailer: item.product.retailer ? {
                      businessName: item.product.retailer.businessName
                    } : null
                  } : null
                }))
              } : null
            }
          }
        };
      } else {
        throw new Error(response.data.message || 'Payment verification failed');
      }
    } catch (error) {
      this.logger.error('Payment verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }

  /**
   * Handle Paystack webhook
   */
  async handleWebhook(payload: any, signature: string) {
    try {
      // Verify webhook signature
      const isValid = this.verifyWebhookSignature(payload, signature);
      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        return { success: false, error: 'Invalid signature' };
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
        callback_url: `${this.configService.get('BACKEND_URL') || 'http://localhost:3000'}/api/paystack/checkout/webhook`,
        metadata: {
          orderId: order.id,
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
    console.log('🔍 [CALCULATE_COMMISSION] Starting commission calculation...');
    console.log('🔍 [CALCULATE_COMMISSION] Order ID:', order.id);
    console.log('🔍 [CALCULATE_COMMISSION] Order Items:', order.orderItems?.length || 0);
    console.log('🔍 [CALCULATE_COMMISSION] Service Appointments:', order.serviceAppointments?.length || 0);
    
    // Calculate total amount from both products and services
    const productAmount = order.orderItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);

    const serviceAmount = order.serviceAppointments?.reduce((sum: number, appointment: any) => {
      return sum + (appointment.servicePrice || 0);
    }, 0) || 0;

    const totalAmount = productAmount + serviceAmount;

    console.log('🔍 [CALCULATE_COMMISSION] Amounts:', {
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
      console.log('🔍 [CALCULATE_COMMISSION] Detected as PRODUCT order (retailer)');
      
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
      console.log('🔍 [CALCULATE_COMMISSION] Detected as SERVICE order (vendor)');
      
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

    console.log('🔍 [CALCULATE_COMMISSION] Partner info:', {
      partnerType,
      partnerEmail: partner?.email,
      partnerSubaccount: partner?.paystackSubaccountId
    });

    if (!partner) {
      console.error('❌ [CALCULATE_COMMISSION] No partner found!');
      throw new Error(`${partnerType || 'Partner'} information not found for this order`);
    }
    
    if (!partner.paystackSubaccountId) {
      throw new Error(`${partnerType === 'retailer' ? 'Retailer' : 'Vendor'} ${partner.email} has not completed onboarding and does not have a Paystack sub-account. Please complete the onboarding process first.`);
    }

    console.log(`💳 [PAYSTACK_CHECKOUT] Commission calculated for ${partnerType}:`, {
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
      console.log('💳 [CART_PAYMENT] ===========================================');
      console.log('💳 [CART_PAYMENT] INITIALIZING CART PAYMENT');
      console.log('💳 [CART_PAYMENT] ===========================================');
      console.log('💳 [CART_PAYMENT] Order ID:', createPaymentDto.orderId);
      console.log('💳 [CART_PAYMENT] Customer Email:', createPaymentDto.customerEmail);
      console.log('💳 [CART_PAYMENT] Amount:', createPaymentDto.amount);
      console.log('💳 [CART_PAYMENT] Currency:', createPaymentDto.currency);

      this.logger.log(`Initializing cart payment for order: ${createPaymentDto.orderId}`);

      // Get user details
      const user = await this.prisma.profile.findFirst({
        where: { email: createPaymentDto.customerEmail }
      });

      if (!user) {
        console.error('❌ [CART_PAYMENT] User not found:', createPaymentDto.customerEmail);
        throw new Error('User not found');
      }

      console.log('✅ [CART_PAYMENT] User found:', user.id);

      // Check if cart items are provided
      const cartItems = createPaymentDto.cartItems || [];
      console.log('💳 [CART_PAYMENT] Cart items received:', cartItems.length);
      
      if (cartItems.length === 0) {
        console.log('⚠️ [CART_PAYMENT] No cart items provided, creating basic order');
        // Fallback to basic order if no cart items provided
        const order = await this.prisma.order.create({
          data: {
            userId: user.id,
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

        console.log('✅ [CART_PAYMENT] Created basic cart order:', order.id);
        
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
      console.log('💳 [CART_PAYMENT] Processing cart items...');
      
      // Create the order
      const order = await this.prisma.order.create({
        data: {
          userId: user.id,
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

      console.log('✅ [CART_PAYMENT] Created cart order:', order.id);

      // Process cart items
      const productItems = cartItems.filter(item => item.type === 'product');
      const serviceItems = cartItems.filter(item => item.type === 'service');

      console.log('💳 [CART_PAYMENT] Cart items breakdown:');
      console.log('💳 [CART_PAYMENT]   - Product items:', productItems.length);
      console.log('💳 [CART_PAYMENT]   - Service items:', serviceItems.length);

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
        console.log('✅ [CART_PAYMENT] Created order items for products');
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
        console.log('✅ [CART_PAYMENT] Created service appointments');
      }

      console.log('💳 [CART_PAYMENT] ORDER DETAILS:');
      console.log('💳 [CART_PAYMENT]   - Order ID:', order.id);
      console.log('💳 [CART_PAYMENT]   - Customer Email:', order.customerEmail);
      console.log('💳 [CART_PAYMENT]   - Total Amount:', order.totalAmount);
      console.log('💳 [CART_PAYMENT]   - Currency:', order.currency);
      console.log('💳 [CART_PAYMENT]   - Product Items:', productItems.length);
      console.log('💳 [CART_PAYMENT]   - Service Appointments:', serviceItems.length);

      // Use Payment Groups for cart orders with items
      console.log('💳 [CART_PAYMENT] Using Payment Groups for cart order with items...');
      
      const paymentData = {
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency || 'KES',
        email: createPaymentDto.customerEmail,
        reference: createPaymentDto.reference,
        metadata: createPaymentDto.metadata
      };

      return await this.paymentsService.processPayment(order.id, paymentData);
    } catch (error) {
      console.error('❌ [CART_PAYMENT] Cart payment initialization failed:', error);
      this.logger.error('Cart payment initialization failed:', error);
      throw error;
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
      console.log('💳 [PAYSTACK_CHECKOUT] ===========================================');
      console.log('💳 [PAYSTACK_CHECKOUT] HANDLING SUCCESSFUL PAYMENT');
      console.log('💳 [PAYSTACK_CHECKOUT] ===========================================');
      
      const reference = data.reference;
      const amount = data.amount / 100; // Convert from kobo to main currency
      const currency = data.currency;
      const customer = data.customer;
      const metadata = data.metadata || {};
      
      console.log('💳 [PAYSTACK_CHECKOUT] PAYMENT DATA:');
      console.log('💳 [PAYSTACK_CHECKOUT]   - Reference:', reference);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Amount (kobo):', data.amount);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Amount (converted):', amount);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Currency:', currency);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Customer Email:', customer?.email);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Customer Code:', customer?.customer_code);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Metadata:', JSON.stringify(metadata, null, 2));
      
      this.logger.log(`Processing successful payment: ${reference}`, {
        amount,
        currency,
        customer: customer?.email,
        metadata
      });
      
      // Find order by payment reference
      console.log('💳 [PAYSTACK_CHECKOUT] Step 1: Looking up order by payment reference...');
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
        console.error('❌ [PAYSTACK_CHECKOUT] Order not found for payment reference:', reference);
        this.logger.warn(`Order not found for payment reference: ${reference}`);
        return;
      }

      console.log('✅ [PAYSTACK_CHECKOUT] Order found:', order.id);
      console.log('💳 [PAYSTACK_CHECKOUT] ORDER DETAILS:');
      console.log('💳 [PAYSTACK_CHECKOUT]   - Order ID:', order.id);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Customer Email:', order.customerEmail);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Total Amount:', order.totalAmount);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Currency:', order.currency);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Current Status:', order.status);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Product Items:', order.orderItems.length);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Service Appointments:', order.serviceAppointments?.length || 0);

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
      console.log('💳 [PAYSTACK_CHECKOUT] PAYMENT TYPE:', isMultiVendor ? 'MULTI-VENDOR ORDER' : 'SINGLE VENDOR ORDER');
      console.log('💳 [PAYSTACK_CHECKOUT] VENDORS INVOLVED:', Array.from(vendors));

      // Update order with comprehensive payment details
      console.log('💳 [PAYSTACK_CHECKOUT] Step 2: Updating order status...');
      const updatedOrder = await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'paid', // Use 'paid' status after payment confirmation
          paymentStatus: 'paid',
          paymentMethod: 'paystack',
          paymentAmount: amount,
          paidAt: new Date(),
          paystackReference: reference,
          confirmedAt: new Date(),
          // Store additional payment metadata
          notes: order.notes ? `${order.notes}\n\nPayment Details:\n- Reference: ${reference}\n- Amount: ${amount} ${currency}\n- Customer: ${customer?.email || 'N/A'}\n- Processed: ${new Date().toISOString()}` : `Payment Details:\n- Reference: ${reference}\n- Amount: ${amount} ${currency}\n- Customer: ${customer?.email || 'N/A'}\n- Processed: ${new Date().toISOString()}`
        }
      });

      console.log('✅ [PAYSTACK_CHECKOUT] Order status updated to confirmed');
      console.log('💳 [PAYSTACK_CHECKOUT] PAYMENT SUMMARY:');
      console.log('💳 [PAYSTACK_CHECKOUT]   - Order ID:', order.id);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Reference:', reference);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Amount:', amount);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Currency:', currency);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Customer Email:', customer?.email);
      console.log('💳 [PAYSTACK_CHECKOUT]   - Payment Method: paystack');
      console.log('💳 [PAYSTACK_CHECKOUT]   - Status: confirmed');
      console.log('💳 [PAYSTACK_CHECKOUT]   - Paid At:', new Date().toISOString());

      this.logger.log(`Order ${order.id} marked as paid successfully`, {
        orderId: order.id,
        reference,
        amount,
        currency,
        customerEmail: customer?.email
      });

      console.log('💳 [PAYSTACK_CHECKOUT] Step 3: Payment processing completed successfully!');
      console.log('💳 [PAYSTACK_CHECKOUT] ===========================================');
      
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
      console.log('❌ [PAYSTACK_CHECKOUT] ===========================================');
      console.log('❌ [PAYSTACK_CHECKOUT] HANDLING FAILED PAYMENT');
      console.log('❌ [PAYSTACK_CHECKOUT] ===========================================');
      
      const reference = data.reference;
      const reason = data.gateway_response || 'Payment failed';
      
      console.log('❌ [PAYSTACK_CHECKOUT] FAILED PAYMENT DATA:');
      console.log('❌ [PAYSTACK_CHECKOUT]   - Reference:', reference);
      console.log('❌ [PAYSTACK_CHECKOUT]   - Reason:', reason);
      console.log('❌ [PAYSTACK_CHECKOUT]   - Gateway Response:', data.gateway_response);
      console.log('❌ [PAYSTACK_CHECKOUT]   - Status:', data.status);
      console.log('❌ [PAYSTACK_CHECKOUT]   - Amount:', data.amount);
      console.log('❌ [PAYSTACK_CHECKOUT]   - Currency:', data.currency);
      
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
}

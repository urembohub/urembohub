import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/payments.service';
// Removed order_status and order_status_enhanced imports as we now use string status

export interface CreateOrderDto {
  cartItems: Array<{
    type: 'product' | 'service';
    id: string;
    name: string;
    price: number;
    quantity?: number;
    vendorId?: string;
    staffId?: string;
    appointmentDate?: string;
    durationMinutes?: number;
    currency: string;
  }>;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    address: string;
    city: string;
  };
  notes?: string;
  currency: string;
  totalAmount: number;
}

export interface UpdateOrderDto {
  status?: string;
  notes?: string;
  escrowAmount?: number;
  escrowStatus?: string;
  commissionAmount?: number;
  commissionRate?: number;
  confirmedAt?: Date;
  completedAt?: Date;
  completionConfirmedAt?: Date;
  disputedAt?: Date;
  autoReleaseAt?: Date;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private paymentsService: PaymentsService,
  ) {}

  async createOrder(userId: string | null, createOrderDto: CreateOrderDto) {
    const { cartItems, ...orderData } = createOrderDto;

    // Extract retailerId and vendorId from cart items
    const productItems = cartItems.filter(item => item.type === 'product');
    const serviceItems = cartItems.filter(item => item.type === 'service');
    
    // Get retailerId from first product item (assuming single retailer per order)
    const retailerId = productItems.length > 0 ? 
      await this.getRetailerIdFromProduct(productItems[0].id) : null;
    
    // Get vendorId from first service item (assuming single vendor per order)
    const vendorId = serviceItems.length > 0 ? serviceItems[0].vendorId : null;

    // Create the order
    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        userId,
        retailerId,
        vendorId,
      },
    });

    // Process cart items (already filtered above)

    // Create order items for products
    if (productItems.length > 0) {
      const orderItems = productItems.map(item => ({
        orderId: order.id,
        productId: item.id,
        quantity: item.quantity || 1,
        unitPrice: item.price,
        totalPrice: item.price * (item.quantity || 1),
        currency: orderData.currency,
        title: item.name,
        type: 'product',
      }));

      await this.prisma.orderItem.createMany({
        data: orderItems,
      });
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
        currency: orderData.currency,
        status: 'PENDING' as const,
        notes: orderData.notes,
      }));

      await this.prisma.serviceAppointment.createMany({
        data: serviceAppointments,
      });
    }

    // Send order confirmation email to customer
    try {
      const orderDataForEmail = {
        orderId: order.id,
        totalAmount: orderData.totalAmount,
        currency: orderData.currency,
        items: cartItems.map(item => item.name)
      };
      await this.emailService.sendNewOrderEmail(
        orderData.customerEmail,
        'Customer',
        order.id,
        orderDataForEmail
      );
      console.log('✅ [ORDER] Customer order confirmation email sent successfully!');
    } catch (error) {
      console.error('❌ [ORDER] Failed to send customer order confirmation email:', error);
      // Don't fail order creation if email fails
    }

    // Send notifications to vendors, retailers, and manufacturers
    await this.sendOrderNotificationsToPartners(order.id, cartItems, orderData);

    return this.getOrderById(order.id);
  }

  async createDoorstepPaymentDueOrder(userId: string | null, createOrderDto: CreateOrderDto) {
    const { cartItems, ...orderData } = createOrderDto;

    // Extract retailerId and vendorId from cart items
    const productItems = cartItems.filter(item => item.type === 'product');
    const serviceItems = cartItems.filter(item => item.type === 'service');
    
    // Get retailerId from first product item (assuming single retailer per order)
    const retailerId = productItems.length > 0 ? 
      await this.getRetailerIdFromProduct(productItems[0].id) : null;
    
    // Get vendorId from first service item (assuming single vendor per order)
    const vendorId = serviceItems.length > 0 ? serviceItems[0].vendorId : null;

    // Create the order with paymentDueAtDoor flag
    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        userId,
        retailerId,
        vendorId,
        status: 'pending',
        paymentDueAtDoor: true,
        paymentStatus: 'pending',
      } as any,
    });

    // Create order items for products
    if (productItems.length > 0) {
      const orderItems = productItems.map(item => ({
        orderId: order.id,
        productId: item.id,
        quantity: item.quantity || 1,
        unitPrice: item.price,
        totalPrice: item.price * (item.quantity || 1),
        currency: orderData.currency,
        title: item.name,
        type: 'product',
      }));

      await this.prisma.orderItem.createMany({
        data: orderItems,
      });
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
        currency: orderData.currency,
        status: 'PENDING' as const,
        notes: orderData.notes,
      }));

      await this.prisma.serviceAppointment.createMany({
        data: serviceAppointments,
      });
    }

    // Fetch order with full relations for package creation
    const orderWithRelations = await this.prisma.order.findUnique({
      where: { id: order.id },
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
                    deliveryDetails: true,
                    pickupMtaaniBusinessDetails: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            deliveryDetails: true,
          },
        },
      },
    });

    // Immediately create Pick Up Mtaani packages
    if (orderWithRelations && productItems.length > 0) {
      console.log('📦 [DOORSTEP_PAYMENT] Creating Pick Up Mtaani packages immediately...');
      try {
        const packageResults = await this.paymentsService.createPickUpMtaaniPackages(orderWithRelations);
        console.log(`📦 [DOORSTEP_PAYMENT] Package creation result:`, packageResults);
        
        // Update order status based on package creation results
        if (packageResults.success && packageResults.totalPackages > 0) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: { 
              status: packageResults.failedPackages.length === 0 ? 'processing' : 'pending',
              packageStatus: packageResults.failedPackages.length === 0 ? 'created' : 'partial',
            },
          });
          
          // Give a small delay to ensure packages are fully saved to database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('❌ [DOORSTEP_PAYMENT] Failed to create packages:', error);
        // Don't fail order creation if package creation fails
      }
    }

    // Send order confirmation email to customer
    try {
      const orderDataForEmail = {
        orderId: order.id,
        totalAmount: orderData.totalAmount,
        currency: orderData.currency,
        items: cartItems.map(item => item.name)
      };
      await this.emailService.sendNewOrderEmail(
        orderData.customerEmail,
        'Customer',
        order.id,
        orderDataForEmail
      );
      console.log('✅ [DOORSTEP_PAYMENT] Customer order confirmation email sent successfully!');
    } catch (error) {
      console.error('❌ [DOORSTEP_PAYMENT] Failed to send customer order confirmation email:', error);
      // Don't fail order creation if email fails
    }

    // Send notifications to vendors, retailers, and manufacturers
    await this.sendOrderNotificationsToPartners(order.id, cartItems, orderData);

    return this.getOrderById(order.id);
  }

  async getAllOrders(status?: string, paymentDueAtDoor?: boolean) {
    const where: any = {};
    if (status) where.status = status;
    if (paymentDueAtDoor !== undefined) (where as any).paymentDueAtDoor = paymentDueAtDoor;
    
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                retailerId: true,
              },
            },
          },
        },
        serviceAppointments: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
                retailerId: true,
              },
            },
          },
        },
        serviceAppointments: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
          },
        },
        shipments: {
          include: {
            statusUpdates: {
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Log package tracking fields for debugging
    console.log('📦 [GET_ORDER_BY_ID] Order package tracking fields:', {
      orderId: order.id,
      packageStatus: order.packageStatus,
      packageTrackingId: order.packageTrackingId,
      packageReceiptNo: order.packageReceiptNo,
      packageTrackingLink: order.packageTrackingLink,
    });

    return order;
  }

  async updateOrder(id: string, userId: string, userRole: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.getOrderById(id);

    // Only the order owner, admin, or related business users can update
    const canUpdate = 
      order.userId === userId || 
      userRole === 'ADMIN' ||
      order.orderItems.some(item => item.product.retailerId === userId) ||
      order.serviceAppointments.some(appointment => appointment.vendorId === userId);

    if (!canUpdate) {
      throw new ForbiddenException('You cannot update this order');
    }

    // Store old status for comparison
    const oldStatus = order.status;

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        serviceAppointments: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
          },
        },
      },
    });

    // Send email notification if status changed
    try {
      const newStatus = updateOrderDto.status;
      if (newStatus && newStatus !== oldStatus) {
        const customerEmail = order.user?.email || order.customerEmail;
        const customerName = order.user?.fullName || 'Customer';
        const orderData = {
          orderId: order.id,
          totalAmount: order.totalAmount,
          currency: order.currency,
          items: order.orderItems.map(item => item.title)
        };
        
        if (newStatus === 'paid') {
          await this.emailService.sendOrderAcceptedEmail(
            customerEmail,
            customerName,
            order.id,
            orderData
          );
        } else if (newStatus === 'shipped' || newStatus === 'in_transit') {
          await this.emailService.sendOrderShippedEmail(
            customerEmail,
            customerName,
            order.id,
            'TRK123456789'
          );
        } else if (newStatus === 'delivered') {
          await this.emailService.sendOrderDeliveredEmail(
            customerEmail,
            customerName,
            order.id
          );
        }
      }
    } catch (error) {
      console.error('Failed to send order status email:', error);
      // Don't fail order update if email fails
    }

    return updatedOrder;
  }

  async getUserOrders(userId: string, paymentDueAtDoor?: boolean) {
    console.log('📋 [GET_USER_ORDERS] Fetching orders for user:', userId);
    
    // Also match orders by customerEmail if userId is available
    // This handles cases where orders might have been created before user login
    const where: any = {};
    
    // If we have userId, also try to get user's email to match orders created as guest
    let userEmail: string | null = null;
    if (userId) {
      try {
        const userProfile = await this.prisma.profile.findUnique({
          where: { id: userId },
          select: { email: true }
        });
        userEmail = userProfile?.email || null;
        console.log('📋 [GET_USER_ORDERS] User email:', userEmail);
      } catch (error) {
        console.error('Error fetching user email for order matching:', error);
      }
    }
    
    // Build where clause - match by userId OR by customerEmail (if user exists)
    if (userEmail) {
      where.OR = [
        { userId },
        { customerEmail: userEmail }
      ];
    } else if (userId) {
      where.userId = userId;
    }
    
    if (paymentDueAtDoor !== undefined) {
      (where as any).paymentDueAtDoor = paymentDueAtDoor;
      console.log('📋 [GET_USER_ORDERS] Filtering by paymentDueAtDoor:', paymentDueAtDoor);
    }
    
    console.log('📋 [GET_USER_ORDERS] Where clause:', JSON.stringify(where, null, 2));
    
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
        serviceAppointments: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
            vendor: {
              select: {
                id: true,
                email: true,
                fullName: true,
                businessName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('📋 [GET_USER_ORDERS] Found orders:', orders.length);
    if (orders.length > 0) {
      console.log('📋 [GET_USER_ORDERS] First order ID:', orders[0].id);
      console.log('📋 [GET_USER_ORDERS] First order createdAt:', orders[0].createdAt);
      console.log('📋 [GET_USER_ORDERS] First order userId:', orders[0].userId);
      console.log('📋 [GET_USER_ORDERS] First order customerEmail:', orders[0].customerEmail);
    }

    // Transform orders to include package tracking data from shippingAddress
    const transformedOrders = orders.map(order => {
      const shippingAddress = order.shippingAddress as any;
      const packages = shippingAddress?.pickupMtaaniPackages || [];
      
      // Get package data for this user's orders
      const userPackages = packages.filter((pkg: any) => 
        // Filter packages that belong to this order
        // Support both: packages with orderId and legacy packages without orderId (if only one package exists)
        pkg.orderId === order.id || (!pkg.orderId && packages.length === 1)
      );

      return {
        ...order,
        // Include package tracking fields for backward compatibility
        packageStatus: order.packageStatus,
        packageTrackingId: order.packageTrackingId,
        packageReceiptNo: order.packageReceiptNo,
        packageTrackingLink: order.packageTrackingLink,
        packageTrackingHistory: order.packageTrackingHistory,
        // Include all packages for this order
        packages: userPackages,
        // Keep original shippingAddress for compatibility
        shippingAddress: {
          ...shippingAddress,
          pickupMtaaniPackages: packages,
        },
      };
    });

    return transformedOrders;
  }

  async confirmOrder(id: string, userId: string, userRole: string) {
    const order = await this.getOrderById(id);
    
    // Check permissions
    const canConfirm = 
      order.userId === userId || 
      userRole === 'admin' ||
      order.retailerId === userId ||
      order.vendorId === userId;

    if (!canConfirm) {
      throw new ForbiddenException('You do not have permission to confirm this order');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        confirmedAt: new Date(),
      },
    });
  }

  async completeOrder(id: string, userId: string, userRole: string) {
    const order = await this.getOrderById(id);
    
    // Check permissions
    const canComplete = 
      order.userId === userId || 
      userRole === 'admin' ||
      order.retailerId === userId ||
      order.vendorId === userId;

    if (!canComplete) {
      throw new ForbiddenException('You do not have permission to complete this order');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'delivered',
        completedAt: new Date(),
      },
    });
  }

  async cancelOrder(id: string, userId: string, userRole: string, reason?: string) {
    const order = await this.getOrderById(id);
    
    // Check permissions
    const canCancel = 
      order.userId === userId || 
      userRole === 'admin' ||
      order.retailerId === userId ||
      order.vendorId === userId;

    if (!canCancel) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: reason ? `${order.notes || ''}\nCancellation reason: ${reason}`.trim() : order.notes,
      },
    });
  }

  async disputeOrder(id: string, userId: string, reason: string, evidence?: any) {
    const order = await this.getOrderById(id);
    
    // Only the order owner can dispute
    if (order.userId !== userId) {
      throw new ForbiddenException('Only the order owner can dispute this order');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'disputed',
        disputedAt: new Date(),
        notes: `${order.notes || ''}\nDispute reason: ${reason}`.trim(),
      },
    });
  }

  async updateEscrowStatus(id: string, escrowAmount: number, escrowStatus: string) {
    return this.prisma.order.update({
      where: { id },
      data: {
        escrowAmount,
        escrowStatus,
      },
    });
  }

  async updateCommission(id: string, commissionAmount: number, commissionRate: number) {
    return this.prisma.order.update({
      where: { id },
      data: {
        commissionAmount,
        commissionRate,
      },
    });
  }

  async getOrdersByStatus(status: string) {
    const orders = await this.prisma.order.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  async getOrdersByUser(userId: string, userRole: string) {
    let where: any = {};
    
    // Different users see different orders based on their role
    switch (userRole) {
      case 'client':
        where = { userId };
        break;
      case 'retailer':
        where = { retailerId: userId };
        break;
      case 'vendor':
        where = { vendorId: userId };
        break;
      case 'manufacturer':
        where = { manufacturerId: userId };
        break;
      case 'admin':
        where = {}; // Admins can see all orders
        break;
      default:
        where = { userId };
    }
    
    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  async getOrderItemsByRetailerId(retailerId: string) {
    return this.prisma.orderItem.findMany({
      where: {
        order: {
          retailerId: retailerId,
          OR: [
            // Regular paid orders
            {
              paymentReference: { not: null },
              paymentStatus: 'paid'
            },
            // Customer pays at door orders (created immediately, payment pending)
            {
              paymentDueAtDoor: true
            } as any
          ]
        }
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            customerEmail: true,
            customerPhone: true,
            shippingAddress: true,
            paymentStatus: true,
            paymentReference: true,
            paystackReference: true,
            paymentDueAtDoor: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          } as any
        },
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            retailerId: true
          }
        }
      },
      orderBy: {
        order: {
          createdAt: 'desc'
        }
      }
    });
  }

  async getServiceAppointmentsByVendorId(vendorId: string) {
    return this.prisma.serviceAppointment.findMany({
      where: {
        vendorId: vendorId,
      },
      include: {
        order: {
          select: {
            createdAt: true,
            clientId: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Send order notifications to vendors, retailers, and manufacturers
   */
  private async sendOrderNotificationsToPartners(orderId: string, cartItems: any[], orderData: any) {
    try {
      console.log('📧 [ORDER] Starting partner notifications for order:', orderId);
      
      // Get unique vendor/retailer/manufacturer IDs from cart items
      const partnerIds = new Set<string>();
      
      // Collect vendor IDs from service items
      cartItems.forEach(item => {
        if (item.type === 'service' && item.vendorId) {
          partnerIds.add(item.vendorId);
        }
        if (item.type === 'product' && item.vendorId) {
          partnerIds.add(item.vendorId);
        }
      });

      // Get partner details from database
      const partners = await this.prisma.profile.findMany({
        where: {
          id: { in: Array.from(partnerIds) },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          businessName: true,
        },
      });

      console.log('📧 [ORDER] Found partners to notify:', partners.length);

      // Send notifications to each partner
      for (const partner of partners) {
        try {
          const orderDataForPartner = {
            order_number: orderId,
            customer_name: orderData.customerEmail,
            total_amount: orderData.totalAmount.toString(),
            order_date: new Date().toLocaleDateString(),
          };

          let emailResult;
          switch (partner.role) {
            case 'vendor':
              emailResult = await this.emailService.sendNewOrderEmail(
                partner.email,
                partner.fullName || partner.businessName || 'Vendor',
                orderId,
                orderDataForPartner
              );
              break;
            case 'retailer':
              emailResult = await this.emailService.sendRetailerNewOrderEmail(
                partner.email,
                partner.fullName || partner.businessName || 'Retailer',
                orderId,
                orderDataForPartner
              );
              break;
            case 'manufacturer':
              emailResult = await this.emailService.sendManufacturerNewOrderEmail(
                partner.email,
                partner.fullName || partner.businessName || 'Manufacturer',
                orderId,
                orderDataForPartner
              );
              break;
            default:
              console.log(`⚠️ [ORDER] Unknown partner role: ${partner.role}`);
              continue;
          }

          if (emailResult?.success) {
            console.log(`✅ [ORDER] ${partner.role} notification sent to ${partner.email} (ID: ${emailResult.messageId})`);
          } else {
            console.error(`❌ [ORDER] ${partner.role} notification failed to ${partner.email}:`, emailResult?.error);
          }
        } catch (error) {
          console.error(`❌ [ORDER] Error sending notification to ${partner.email}:`, error);
        }
      }

      console.log('📧 [ORDER] Partner notifications completed');
    } catch (error) {
      console.error('❌ [ORDER] Error in sendOrderNotificationsToPartners:', error);
      // Don't fail order creation if partner notifications fail
    }
  }

  /**
   * Get retailerId from product
   */
  private async getRetailerIdFromProduct(productId: string): Promise<string | null> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { retailerId: true }
      });
      return product?.retailerId || null;
    } catch (error) {
      console.error('❌ [ORDER] Error getting retailerId from product:', error);
      return null;
    }
  }
}

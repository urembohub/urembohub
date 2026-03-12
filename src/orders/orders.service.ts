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

    // Send "Order Received" email to customer (order is pending)
    try {
      const customerName = orderData.customerEmail.split('@')[0]; // Extract name from email
      const orderDataForEmail = {
        orderId: order.id,
        totalAmount: orderData.totalAmount,
        currency: orderData.currency,
        items: cartItems.map(item => item.name)
      };
      await this.emailService.sendOrderReceivedEmail(
        orderData.customerEmail,
        customerName,
        order.id,
        orderDataForEmail
      );
      console.log('✅ [ORDER] Customer order received email sent successfully!');
    } catch (error) {
      console.error('❌ [ORDER] Failed to send customer order received email:', error);
      // Don't fail order creation if email fails
    }

    // Send notifications to vendors, retailers, and manufacturers
    // For service orders, vendors will receive "Order Placed and Being Processed" email
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

    // Send "Order Received" email to customer (order is pending)
    try {
      const customerName = orderData.customerEmail.split('@')[0]; // Extract name from email
      const orderDataForEmail = {
        orderId: order.id,
        totalAmount: orderData.totalAmount,
        currency: orderData.currency,
        items: cartItems.map(item => item.name)
      };
      await this.emailService.sendOrderReceivedEmail(
        orderData.customerEmail,
        customerName,
        order.id,
        orderDataForEmail
      );
      console.log('✅ [DOORSTEP_PAYMENT] Customer order received email sent successfully!');
    } catch (error) {
      console.error('❌ [DOORSTEP_PAYMENT] Failed to send customer order received email:', error);
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
        
        // Only send order accepted email for product orders, not service orders
        // Service orders should only send confirmation when vendor confirms appointment
        if (newStatus === 'paid') {
          // Check if this order has service appointments
          const hasServiceAppointments = await this.prisma.serviceAppointment.findFirst({
            where: { orderId: order.id }
          });
          
          // Only send confirmation email if it's NOT a service order
          if (!hasServiceAppointments) {
            await this.emailService.sendOrderAcceptedEmail(
              customerEmail,
              customerName,
              order.id,
              orderData
            );
          }
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

    return orders;
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

  async getServiceAppointmentsByVendorId(vendorId: string, includeSensitiveData: boolean = true) {
    console.log('🔍 [ORDERS_SERVICE] getServiceAppointmentsByVendorId called:', {
      vendorId,
      vendorIdType: typeof vendorId,
      includeSensitiveData,
    });
    
    try {
      // Build select objects conditionally
      const orderSelect: any = {
        createdAt: true,
      };
      if (includeSensitiveData) {
        orderSelect.clientId = true;
      }
      
      const serviceSelect: any = {
        id: true,
        name: true,
        vendorId: true,
      };
      if (includeSensitiveData) {
        serviceSelect.price = true;
      }
      
      const appointments = await this.prisma.serviceAppointment.findMany({
        where: {
          vendorId: vendorId,
        },
        include: {
          order: {
            select: orderSelect,
          },
          service: {
            select: serviceSelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // For public/client access, only return essential booking info
      const filteredAppointments = includeSensitiveData 
        ? appointments 
        : appointments.map(apt => ({
            id: apt.id,
            vendorId: apt.vendorId,
            serviceId: apt.serviceId,
            appointmentDate: apt.appointmentDate,
            durationMinutes: apt.durationMinutes,
            status: apt.status,
            service: {
              id: apt.service?.id,
              name: apt.service?.name,
              vendorId: apt.service?.vendorId,
            },
            order: {
              createdAt: apt.order?.createdAt,
            },
          }));
      
      console.log('✅ [ORDERS_SERVICE] Found service appointments:', {
        count: filteredAppointments.length,
        vendorId,
        includeSensitiveData,
        sampleAppointments: filteredAppointments.slice(0, 3).map(apt => ({
          id: apt.id,
          serviceVendorId: apt.service?.vendorId,
          appointmentVendorId: apt.vendorId,
          appointmentDate: apt.appointmentDate,
        })),
      });
      
      return filteredAppointments;
    } catch (error) {
      console.error('❌ [ORDERS_SERVICE] Error fetching service appointments:', error);
      throw error;
    }
  }

  async updateServiceAppointmentStatus(
    serviceAppointmentId: string,
    userId: string,
    userRole: string,
    status: string,
    notes?: string
  ) {
    console.log('📋 [APPOINTMENT] ===========================================');
    console.log('📋 [APPOINTMENT] updateServiceAppointmentStatus called');
    console.log('📋 [APPOINTMENT] ===========================================');
    console.log('📋 [APPOINTMENT] Parameters:');
    console.log('📋 [APPOINTMENT]   - serviceAppointmentId:', serviceAppointmentId);
    console.log('📋 [APPOINTMENT]   - userId:', userId);
    console.log('📋 [APPOINTMENT]   - userRole:', userRole);
    console.log('📋 [APPOINTMENT]   - status:', status);
    console.log('📋 [APPOINTMENT]   - notes:', notes || 'none');
    
    const serviceAppointment = await this.prisma.serviceAppointment.findUnique({
      where: { id: serviceAppointmentId },
      include: {
        vendor: true,
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            customerEmail: true,
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!serviceAppointment) {
      console.error('❌ [APPOINTMENT] Service appointment not found:', serviceAppointmentId);
      throw new NotFoundException('Service appointment not found');
    }

    console.log('✅ [APPOINTMENT] Service appointment found');
    console.log('📋 [APPOINTMENT] Current appointment status:', serviceAppointment.status);
    console.log('📋 [APPOINTMENT] New status requested:', status);
    console.log('📋 [APPOINTMENT] Appointment vendorId:', serviceAppointment.vendorId);
    console.log('📋 [APPOINTMENT] Order userId:', serviceAppointment.order.userId);

    // Only the vendor, admin, or order owner can update
    const canUpdate = 
      serviceAppointment.vendorId === userId || 
      userRole === 'ADMIN' ||
      serviceAppointment.order.userId === userId;

    if (!canUpdate) {
      console.error('❌ [APPOINTMENT] Access denied');
      console.error('❌ [APPOINTMENT] User ID:', userId);
      console.error('❌ [APPOINTMENT] User Role:', userRole);
      console.error('❌ [APPOINTMENT] Vendor ID:', serviceAppointment.vendorId);
      throw new ForbiddenException('You cannot update this service appointment');
    }

    console.log('✅ [APPOINTMENT] User has permission to update');

    const updatedAppointment = await this.prisma.serviceAppointment.update({
      where: { id: serviceAppointmentId },
      data: {
        status,
        notes: notes || serviceAppointment.notes,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            customerEmail: true,
            userId: true,
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    // Send appointment status change emails to client
    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT] Checking for email notifications...');
    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT] Raw status (new):', status);
    console.log('📧 [APPOINTMENT] Raw status (old):', serviceAppointment.status);
    
    const normalizedStatus = status.toUpperCase();
    const normalizedOldStatus = serviceAppointment.status.toUpperCase();
    
    console.log('📧 [APPOINTMENT] Normalized status (new):', normalizedStatus);
    console.log('📧 [APPOINTMENT] Normalized status (old):', normalizedOldStatus);
    console.log('📧 [APPOINTMENT] Status changed?', normalizedStatus !== normalizedOldStatus);
    
    // Helper function to get customer email and name
    const getCustomerInfo = () => {
      console.log('📧 [APPOINTMENT] Getting customer info...');
      console.log('📧 [APPOINTMENT]   - order.user?.email:', serviceAppointment.order.user?.email || 'undefined');
      console.log('📧 [APPOINTMENT]   - order.customerEmail:', serviceAppointment.order.customerEmail || 'undefined');
      
      const customerEmail = serviceAppointment.order.user?.email || serviceAppointment.order.customerEmail;
      if (!customerEmail) {
        console.warn('⚠️ [APPOINTMENT] ⚠️⚠️⚠️ No customer email found for appointment ⚠️⚠️⚠️');
        console.warn('⚠️ [APPOINTMENT] Appointment ID:', serviceAppointmentId);
        console.warn('⚠️ [APPOINTMENT] Order.user:', serviceAppointment.order.user);
        console.warn('⚠️ [APPOINTMENT] Order.customerEmail:', serviceAppointment.order.customerEmail);
        return null;
      }
      const customerName = serviceAppointment.order.user?.fullName || customerEmail.split('@')[0] || 'Customer';
      console.log('✅ [APPOINTMENT] Customer info found:', { customerEmail, customerName });
      return { customerEmail, customerName };
    };

    // Helper function to prepare booking data
    const prepareBookingData = () => {
      console.log('📧 [APPOINTMENT] Preparing booking data...');
      const appointmentDate = new Date(serviceAppointment.appointmentDate);
      const durationMinutes = serviceAppointment.durationMinutes || 60;
      const endTime = new Date(appointmentDate.getTime() + durationMinutes * 60000);
      
      const bookingData = {
        bookingId: serviceAppointment.id,
        serviceName: serviceAppointment.service?.name || 'Service',
        appointmentDate: serviceAppointment.appointmentDate,
        startTime: appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        endTime: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        price: serviceAppointment.servicePrice,
        currency: serviceAppointment.currency || 'KES',
      };
      console.log('✅ [APPOINTMENT] Booking data prepared:', bookingData);
      return bookingData;
    };

    // Send confirmation email when status changes to CONFIRMED
    console.log('📧 [APPOINTMENT] Checking for CONFIRMED status...');
    console.log('📧 [APPOINTMENT]   - normalizedStatus === "CONFIRMED":', normalizedStatus === 'CONFIRMED');
    console.log('📧 [APPOINTMENT]   - normalizedOldStatus !== "CONFIRMED":', normalizedOldStatus !== 'CONFIRMED');
    console.log('📧 [APPOINTMENT]   - Should send confirmation?', normalizedStatus === 'CONFIRMED' && normalizedOldStatus !== 'CONFIRMED');
    
    if (normalizedStatus === 'CONFIRMED' && normalizedOldStatus !== 'CONFIRMED') {
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] Vendor confirmed appointment - sending email to client');
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] Appointment ID:', serviceAppointmentId);
      console.log('📧 [APPOINTMENT] Old Status:', normalizedOldStatus);
      console.log('📧 [APPOINTMENT] New Status:', normalizedStatus);
      
      try {
        const customerInfo = getCustomerInfo();
        if (!customerInfo) {
          return updatedAppointment;
        }
        
        console.log('✅ [APPOINTMENT] Customer email found:', customerInfo.customerEmail);
        console.log('📧 [APPOINTMENT] Customer name:', customerInfo.customerName);
        
        const bookingData = prepareBookingData();
        
        console.log('📧 [APPOINTMENT] Booking data prepared:', {
          bookingId: bookingData.bookingId,
          serviceName: bookingData.serviceName,
          appointmentDate: bookingData.appointmentDate,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
        });

        console.log('📧 [APPOINTMENT] Calling email service...');
        const emailResult = await this.emailService.sendBookingConfirmedClientEmail(
          customerInfo.customerEmail,
          customerInfo.customerName,
          bookingData
        );
        
        console.log('📧 [APPOINTMENT] Email service returned:', JSON.stringify(emailResult, null, 2));
        
        if (emailResult?.success) {
          console.log('✅ [APPOINTMENT] ✅✅✅ Appointment confirmation email sent successfully to client ✅✅✅');
          console.log('✅ [APPOINTMENT] Customer:', customerInfo.customerEmail);
          console.log('✅ [APPOINTMENT] Message ID:', emailResult.messageId || 'N/A');
        } else {
          console.error('❌ [APPOINTMENT] ❌❌❌ Failed to send appointment confirmation email ❌❌❌');
          console.error('❌ [APPOINTMENT] Error:', emailResult?.error);
        }
      } catch (error) {
        console.error('❌ [APPOINTMENT] ❌❌❌ Exception caught while sending appointment confirmation email ❌❌❌');
        console.error('❌ [APPOINTMENT] Error type:', error?.constructor?.name);
        console.error('❌ [APPOINTMENT] Error message:', error?.message);
        console.error('❌ [APPOINTMENT] Error stack:', error?.stack);
        // Don't fail status update if email fails
      }
    }

    // Send cancelled email when status changes to CANCELLED
    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT] Checking for CANCELLED status...');
    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT]   - normalizedStatus:', normalizedStatus);
    console.log('📧 [APPOINTMENT]   - normalizedStatus === "CANCELLED":', normalizedStatus === 'CANCELLED');
    console.log('📧 [APPOINTMENT]   - normalizedOldStatus:', normalizedOldStatus);
    console.log('📧 [APPOINTMENT]   - normalizedOldStatus !== "CANCELLED":', normalizedOldStatus !== 'CANCELLED');
    console.log('📧 [APPOINTMENT]   - Combined condition:', normalizedStatus === 'CANCELLED' && normalizedOldStatus !== 'CANCELLED');
    console.log('📧 [APPOINTMENT]   - Will enter cancellation block?', normalizedStatus === 'CANCELLED' && normalizedOldStatus !== 'CANCELLED');
    
    if (normalizedStatus === 'CANCELLED' && normalizedOldStatus !== 'CANCELLED') {
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] ✅ ENTERING CANCELLATION EMAIL BLOCK ✅');
      console.log('📧 [APPOINTMENT] Appointment cancelled - sending email to client');
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] Appointment ID:', serviceAppointmentId);
      console.log('📧 [APPOINTMENT] Old Status:', normalizedOldStatus);
      console.log('📧 [APPOINTMENT] New Status:', normalizedStatus);
      
      try {
        const customerInfo = getCustomerInfo();
        if (!customerInfo) {
          return updatedAppointment;
        }
        
        console.log('✅ [APPOINTMENT] Customer email found:', customerInfo.customerEmail);
        console.log('📧 [APPOINTMENT] Customer name:', customerInfo.customerName);
        
        const bookingData = prepareBookingData();
        const cancellationReason = notes || undefined;
        
        console.log('📧 [APPOINTMENT] Booking data prepared:', {
          bookingId: bookingData.bookingId,
          serviceName: bookingData.serviceName,
          appointmentDate: bookingData.appointmentDate,
          cancellationReason: cancellationReason || 'none',
        });

        console.log('📧 [APPOINTMENT] ===========================================');
        console.log('📧 [APPOINTMENT] Calling email service for cancellation...');
        console.log('📧 [APPOINTMENT] ===========================================');
        console.log('📧 [APPOINTMENT] Email parameters:');
        console.log('📧 [APPOINTMENT]   - customerEmail:', customerInfo.customerEmail);
        console.log('📧 [APPOINTMENT]   - customerName:', customerInfo.customerName);
        console.log('📧 [APPOINTMENT]   - bookingData:', JSON.stringify(bookingData, null, 2));
        console.log('📧 [APPOINTMENT]   - cancellationReason:', cancellationReason || 'none');
        console.log('📧 [APPOINTMENT] Calling sendBookingCancelledClientEmail...');
        
        const emailResult = await this.emailService.sendBookingCancelledClientEmail(
          customerInfo.customerEmail,
          customerInfo.customerName,
          bookingData,
          cancellationReason
        );
        
        console.log('📧 [APPOINTMENT] ===========================================');
        console.log('📧 [APPOINTMENT] Email service returned:');
        console.log('📧 [APPOINTMENT] ===========================================');
        console.log('📧 [APPOINTMENT] Full result:', JSON.stringify(emailResult, null, 2));
        
        if (emailResult?.success) {
          console.log('✅ [APPOINTMENT] ✅✅✅ Appointment cancelled email sent successfully to client ✅✅✅');
          console.log('✅ [APPOINTMENT] Customer:', customerInfo.customerEmail);
          console.log('✅ [APPOINTMENT] Message ID:', emailResult.messageId || 'N/A');
        } else {
          console.error('❌ [APPOINTMENT] ❌❌❌ Failed to send appointment cancelled email ❌❌❌');
          console.error('❌ [APPOINTMENT] Error:', emailResult?.error);
        }
      } catch (error) {
        console.error('❌ [APPOINTMENT] ❌❌❌ Exception caught while sending appointment cancelled email ❌❌❌');
        console.error('❌ [APPOINTMENT] Error type:', error?.constructor?.name);
        console.error('❌ [APPOINTMENT] Error message:', error?.message);
        console.error('❌ [APPOINTMENT] Error stack:', error?.stack);
        // Don't fail status update if email fails
      }
    } else {
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] ⚠️ NOT entering cancellation block');
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] Reason: Condition not met');
      console.log('📧 [APPOINTMENT]   - normalizedStatus:', normalizedStatus);
      console.log('📧 [APPOINTMENT]   - normalizedStatus === "CANCELLED":', normalizedStatus === 'CANCELLED');
      console.log('📧 [APPOINTMENT]   - normalizedOldStatus:', normalizedOldStatus);
      console.log('📧 [APPOINTMENT]   - normalizedOldStatus !== "CANCELLED":', normalizedOldStatus !== 'CANCELLED');
    }

    // Send rejected email when status changes to REJECTED
    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT] Checking for REJECTED status...');
    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT]   - normalizedStatus === "REJECTED":', normalizedStatus === 'REJECTED');
    console.log('📧 [APPOINTMENT]   - normalizedOldStatus !== "REJECTED":', normalizedOldStatus !== 'REJECTED');
    console.log('📧 [APPOINTMENT]   - Will enter rejection block?', normalizedStatus === 'REJECTED' && normalizedOldStatus !== 'REJECTED');
    
    if (normalizedStatus === 'REJECTED' && normalizedOldStatus !== 'REJECTED') {
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] ✅ ENTERING REJECTION EMAIL BLOCK ✅');
      console.log('📧 [APPOINTMENT] Appointment rejected - sending email to client');
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] Appointment ID:', serviceAppointmentId);
      console.log('📧 [APPOINTMENT] Old Status:', normalizedOldStatus);
      console.log('📧 [APPOINTMENT] New Status:', normalizedStatus);
      
      try {
        const customerInfo = getCustomerInfo();
        if (!customerInfo) {
          return updatedAppointment;
        }
        
        console.log('✅ [APPOINTMENT] Customer email found:', customerInfo.customerEmail);
        console.log('📧 [APPOINTMENT] Customer name:', customerInfo.customerName);
        
        const bookingData = prepareBookingData();
        const rejectionReason = notes || undefined;
        
        console.log('📧 [APPOINTMENT] Booking data prepared:', {
          bookingId: bookingData.bookingId,
          serviceName: bookingData.serviceName,
          appointmentDate: bookingData.appointmentDate,
          rejectionReason: rejectionReason || 'none',
        });

        console.log('📧 [APPOINTMENT] Calling email service...');
        const emailResult = await this.emailService.sendBookingRejectedClientEmail(
          customerInfo.customerEmail,
          customerInfo.customerName,
          bookingData,
          rejectionReason
        );
        
        console.log('📧 [APPOINTMENT] Email service returned:', JSON.stringify(emailResult, null, 2));
        
        if (emailResult?.success) {
          console.log('✅ [APPOINTMENT] ✅✅✅ Appointment rejected email sent successfully to client ✅✅✅');
          console.log('✅ [APPOINTMENT] Customer:', customerInfo.customerEmail);
          console.log('✅ [APPOINTMENT] Message ID:', emailResult.messageId || 'N/A');
        } else {
          console.error('❌ [APPOINTMENT] ❌❌❌ Failed to send appointment rejected email ❌❌❌');
          console.error('❌ [APPOINTMENT] Error:', emailResult?.error);
        }
      } catch (error) {
        console.error('❌ [APPOINTMENT] ❌❌❌ Exception caught while sending appointment rejected email ❌❌❌');
        console.error('❌ [APPOINTMENT] Error type:', error?.constructor?.name);
        console.error('❌ [APPOINTMENT] Error message:', error?.message);
        console.error('❌ [APPOINTMENT] Error stack:', error?.stack);
        // Don't fail status update if email fails
      }
    } else {
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] ⚠️ NOT entering rejection block');
      console.log('📧 [APPOINTMENT] ===========================================');
      console.log('📧 [APPOINTMENT] Reason: Condition not met');
      console.log('📧 [APPOINTMENT]   - normalizedStatus:', normalizedStatus);
      console.log('📧 [APPOINTMENT]   - normalizedStatus === "REJECTED":', normalizedStatus === 'REJECTED');
      console.log('📧 [APPOINTMENT]   - normalizedOldStatus:', normalizedOldStatus);
      console.log('📧 [APPOINTMENT]   - normalizedOldStatus !== "REJECTED":', normalizedOldStatus !== 'REJECTED');
    }

    console.log('📧 [APPOINTMENT] ===========================================');
    console.log('📧 [APPOINTMENT] Email notification checks completed');
    console.log('📧 [APPOINTMENT] ===========================================');

    return updatedAppointment;
  }

  async updateServiceAppointmentDate(
    serviceAppointmentId: string,
    userId: string,
    userRole: string,
    appointmentDate: string,
    notes?: string
  ) {
    const serviceAppointment = await this.prisma.serviceAppointment.findUnique({
      where: { id: serviceAppointmentId },
      include: {
        vendor: true,
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!serviceAppointment) {
      throw new NotFoundException('Service appointment not found');
    }

    // Only the vendor, admin, or order owner can update
    const canUpdate = 
      serviceAppointment.vendorId === userId || 
      userRole === 'ADMIN' ||
      serviceAppointment.order.userId === userId;

    if (!canUpdate) {
      throw new ForbiddenException('You cannot update this service appointment');
    }

    return this.prisma.serviceAppointment.update({
      where: { id: serviceAppointmentId },
      data: {
        appointmentDate: new Date(appointmentDate),
        notes: notes || serviceAppointment.notes,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        order: {
          select: {
            id: true,
            clientId: true,
          },
        },
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
            orderId: orderId,
            totalAmount: orderData.totalAmount,
            currency: orderData.currency,
            items: cartItems.map(item => item.name),
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

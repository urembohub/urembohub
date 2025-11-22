import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManufacturerOrderDto } from './dto/create-manufacturer-order.dto';
import { UpdateManufacturerOrderDto } from './dto/update-manufacturer-order.dto';
import { PaystackCheckoutService } from '../paystack/paystack-checkout.service';
import { PickupMtaaniService, CreatePackageDto } from '../pickup-mtaani/pickup-mtaani.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ManufacturerOrdersService {
  constructor(
    private prisma: PrismaService,
    private paystackCheckoutService: PaystackCheckoutService,
    private pickupMtaaniService: PickupMtaaniService,
    private configService: ConfigService,
  ) {}

  // Calculate reserved stock for a manufacturer product
  // Reserved stock = sum of quantities from orders with status: pending, approved, confirmed
  async calculateReservedStock(manufacturerProductId: string): Promise<number> {
    const reservedOrders = await this.prisma.manufacturerOrder.aggregate({
      where: {
        productId: manufacturerProductId,
        status: {
          in: ['pending', 'approved', 'confirmed']
        }
      },
      _sum: {
        quantity: true
      }
    });

    return reservedOrders._sum.quantity || 0;
  }

  // Get all manufacturer orders with filtering and pagination
  async getAllOrders(
    page: number = 1,
    limit: number = 10,
    status?: string,
    manufacturerId?: string,
    retailerId?: string
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (status) where.status = status;
    if (manufacturerId) where.manufacturerId = manufacturerId;
    if (retailerId) where.retailerId = retailerId;

    const [orders, total] = await Promise.all([
      this.prisma.manufacturerOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          retailer: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              phone: true,
            },
          },
          manufacturer: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              phone: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              imageUrl: true,
              stockQuantity: true,
              sku: true,
            },
          },
        },
      }),
      this.prisma.manufacturerOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get order by ID
  async getOrderById(id: string) {
    const order = await this.prisma.manufacturerOrder.findUnique({
      where: { id },
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
            businessAddress: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
            businessAddress: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
            stockQuantity: true,
            sku: true,
            category: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Manufacturer order not found');
    }

    return order;
  }

  // Create new manufacturer order (retailer places order with manufacturer)
  async createOrder(createOrderDto: CreateManufacturerOrderDto, retailerId: string) {
    const {
      manufacturerId,
      productId,
      quantity,
      notes,
      shippingAddress,
      billingAddress,
      paymentTerms,
      requestedDeliveryDate,
      metadata,
      tags = [],
      discount = 0,
      tax = 0,
      shippingCost = 0,
    } = createOrderDto;

    // Validate manufacturer exists
    const manufacturer = await this.prisma.profile.findUnique({
      where: { id: manufacturerId },
    });
    if (!manufacturer) {
      throw new BadRequestException('Invalid manufacturer ID');
    }

    // Validate product exists and belongs to manufacturer
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new BadRequestException('Invalid product ID');
    }

    if (product.retailerId !== manufacturerId) {
      throw new BadRequestException('Product does not belong to the specified manufacturer');
    }

    // Check if product has sufficient stock
    if (product.stockQuantity < quantity) {
      throw new BadRequestException('Insufficient stock available');
    }

    // Calculate pricing
    const unitPrice = product.price;
    const subtotal = Number(unitPrice) * quantity;
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * tax) / 100;
    const totalAmount = taxableAmount + taxAmount + shippingCost;

    const order = await this.prisma.manufacturerOrder.create({
      data: {
        retailerId,
        manufacturerId,
        productId,
        quantity,
        unitPrice,
        subtotal,
        discount,
        tax,
        shippingCost,
        totalAmount,
        currency: product.currency,
        notes,
        shippingAddress: shippingAddress ? (typeof shippingAddress === 'string' ? JSON.parse(shippingAddress) : shippingAddress) : null,
        requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
        status: 'pending',
        // paymentStatus will default to 'pending' from schema
      },
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
            stockQuantity: true,
            sku: true,
          },
        },
      },
    });

    return order;
  }

  // Update manufacturer order (manufacturer can update status, tracking, etc.)
  async updateOrder(id: string, updateOrderDto: UpdateManufacturerOrderDto, userId: string, userRole: string) {
    const order = await this.getOrderById(id);

    // Check permissions - manufacturer can update their orders, retailer can update their orders
    if (userRole !== 'admin' && order.manufacturerId !== userId && order.retailerId !== userId) {
      throw new ForbiddenException('You can only update your own orders');
    }

    // If manufacturer is updating, they can update status, tracking, etc.
    // If retailer is updating, they can update notes, addresses, etc.
    const allowedUpdates: any = {};
    
    if (order.manufacturerId === userId || userRole === 'admin') {
      // Manufacturer updates
      if (updateOrderDto.status) allowedUpdates.status = updateOrderDto.status;
      if (updateOrderDto.trackingNumber) allowedUpdates.trackingNumber = updateOrderDto.trackingNumber;
      if (updateOrderDto.shippingCarrier) allowedUpdates.shippingCarrier = updateOrderDto.shippingCarrier;
      if (updateOrderDto.estimatedDelivery) allowedUpdates.estimatedDelivery = new Date(updateOrderDto.estimatedDelivery);
      if (updateOrderDto.actualDelivery) allowedUpdates.actualDelivery = new Date(updateOrderDto.actualDelivery);
      if (updateOrderDto.unitPrice) allowedUpdates.unitPrice = updateOrderDto.unitPrice;
      if (updateOrderDto.discount !== undefined) allowedUpdates.discount = updateOrderDto.discount;
      if (updateOrderDto.tax !== undefined) allowedUpdates.tax = updateOrderDto.tax;
      if (updateOrderDto.shippingCost !== undefined) allowedUpdates.shippingCost = updateOrderDto.shippingCost;
    }
    
    if (order.retailerId === userId || userRole === 'admin') {
      // Retailer updates
      if (updateOrderDto.notes) allowedUpdates.notes = updateOrderDto.notes;
      if (updateOrderDto.shippingAddress) allowedUpdates.shippingAddress = updateOrderDto.shippingAddress;
      if (updateOrderDto.billingAddress) allowedUpdates.billingAddress = updateOrderDto.billingAddress;
      if (updateOrderDto.paymentTerms) allowedUpdates.paymentTerms = updateOrderDto.paymentTerms;
      if (updateOrderDto.requestedDeliveryDate) allowedUpdates.requestedDeliveryDate = new Date(updateOrderDto.requestedDeliveryDate);
    }

    // Recalculate totals if pricing changed
    if (updateOrderDto.unitPrice || updateOrderDto.discount !== undefined || updateOrderDto.tax !== undefined || updateOrderDto.shippingCost !== undefined) {
      const newUnitPrice = updateOrderDto.unitPrice || order.unitPrice;
      const newDiscount = updateOrderDto.discount !== undefined ? updateOrderDto.discount : order.discount;
      const newTax = updateOrderDto.tax !== undefined ? updateOrderDto.tax : order.tax;
      const newShippingCost = updateOrderDto.shippingCost !== undefined ? updateOrderDto.shippingCost : order.shippingCost;
      
      const subtotal = Number(newUnitPrice) * order.quantity;
      const discountAmount = (subtotal * Number(newDiscount)) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * Number(newTax)) / 100;
      const totalAmount = taxableAmount + taxAmount + Number(newShippingCost);

      allowedUpdates.subtotal = subtotal;
      allowedUpdates.discountAmount = discountAmount;
      allowedUpdates.taxAmount = taxAmount;
      allowedUpdates.totalAmount = totalAmount;
    }

    const updatedOrder = await this.prisma.manufacturerOrder.update({
      where: { id },
      data: allowedUpdates,
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
            stockQuantity: true,
            sku: true,
          },
        },
      },
    });

    return updatedOrder;
  }

  // Cancel manufacturer order
  async cancelOrder(id: string, userId: string, userRole: string, reason?: string) {
    const order = await this.getOrderById(id);

    // Check permissions
    if (userRole !== 'admin' && order.retailerId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      throw new BadRequestException('Order cannot be cancelled in current status');
    }

    const updatedOrder = await this.prisma.manufacturerOrder.update({
      where: { id },
      data: {
        status: 'cancelled',
        notes: reason ? `${order.notes || ''}\nCancellation reason: ${reason}`.trim() : order.notes,
      },
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
            stockQuantity: true,
            sku: true,
          },
        },
      },
    });

    return updatedOrder;
  }

  // Get manufacturer's orders (orders received from retailers)
  async getManufacturerOrders(manufacturerId: string, page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = { manufacturerId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.manufacturerOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          retailer: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              phone: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              imageUrl: true,
              stockQuantity: true,
              sku: true,
            },
          },
        },
      }),
      this.prisma.manufacturerOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get retailer's orders (orders placed with manufacturers)
  async getRetailerOrders(retailerId: string, page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    
    const where: any = { retailerId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.manufacturerOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          manufacturer: {
            select: {
              id: true,
              fullName: true,
              businessName: true,
              email: true,
              phone: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              imageUrl: true,
              stockQuantity: true,
              sku: true,
            },
          },
        },
      }),
      this.prisma.manufacturerOrder.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get manufacturer order statistics
  async getManufacturerOrderStats(manufacturerId?: string, retailerId?: string) {
    let where: any = {};
    
    if (manufacturerId) where.manufacturerId = manufacturerId;
    if (retailerId) where.retailerId = retailerId;

    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.manufacturerOrder.count({ where }),
      this.prisma.manufacturerOrder.count({ where: { ...where, status: 'pending' } }),
      this.prisma.manufacturerOrder.count({ where: { ...where, status: 'confirmed' } }),
      this.prisma.manufacturerOrder.count({ where: { ...where, status: 'processing' } }),
      this.prisma.manufacturerOrder.count({ where: { ...where, status: 'shipped' } }),
      this.prisma.manufacturerOrder.count({ where: { ...where, status: 'delivered' } }),
      this.prisma.manufacturerOrder.count({ where: { ...where, status: 'cancelled' } }),
      this.prisma.manufacturerOrder.aggregate({
        where: { ...where, status: { not: 'cancelled' } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
    };
  }

  // Search manufacturer orders
  async searchOrders(query: string, manufacturerId?: string, retailerId?: string) {
    let where: any = {
      OR: [
        { notes: { contains: query, mode: 'insensitive' } },
        { trackingNumber: { contains: query, mode: 'insensitive' } },
        { shippingCarrier: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ],
    };

    if (manufacturerId) where.manufacturerId = manufacturerId;
    if (retailerId) where.retailerId = retailerId;

    return this.prisma.manufacturerOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        retailer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        manufacturer: {
          select: {
            id: true,
            fullName: true,
            businessName: true,
            email: true,
            phone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            currency: true,
            imageUrl: true,
            stockQuantity: true,
            sku: true,
          },
        },
      },
    });
  }

  // Initialize payment for manufacturer order
  async initializePayment(orderId: string) {
    const order = await this.getOrderById(orderId);

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }

    if (order.status === 'cancelled') {
      throw new BadRequestException('Cannot initialize payment for cancelled order');
    }

    // Get retailer email for payment
    const retailer = await this.prisma.profile.findUnique({
      where: { id: order.retailerId },
      select: { email: true, fullName: true },
    });

    if (!retailer?.email) {
      throw new BadRequestException('Retailer email not found');
    }

    // Create payment DTO for Paystack
    const paymentDto = {
      orderId: `manufacturer-order-${orderId}`,
      customerEmail: retailer.email,
      amount: Number(order.totalAmount),
      currency: order.currency || 'KES',
    };

    console.log('💳 [MANUFACTURER_ORDER_PAYMENT] Initializing payment for order:', orderId);
    console.log('💳 [MANUFACTURER_ORDER_PAYMENT] Amount:', paymentDto.amount);
    console.log('💳 [MANUFACTURER_ORDER_PAYMENT] Currency:', paymentDto.currency);

    // Initialize payment via Paystack
    const paymentResult = await this.paystackCheckoutService.initializePayment(paymentDto);

    if (!paymentResult.success) {
      const errorMessage = ('error' in paymentResult ? paymentResult.error : null) || 
                          ('message' in paymentResult ? paymentResult.message : null) || 
                          'Failed to initialize payment';
      throw new BadRequestException(errorMessage);
    }

    // Type assertion: when success is true, data should exist
    const successResult = paymentResult as { success: true; data: { reference: string; authorization_url: string; access_code: string } };
    
    if (!successResult.data) {
      throw new BadRequestException('Payment initialization succeeded but no data returned');
    }

    // Update order with payment reference
    await this.prisma.manufacturerOrder.update({
      where: { id: orderId },
      data: {
        paystackReference: successResult.data.reference,
        // paymentStatus defaults to 'pending' in schema, so we don't need to set it explicitly
      },
    });

    return {
      success: true,
      authorizationUrl: successResult.data.authorization_url,
      reference: successResult.data.reference,
      accessCode: successResult.data.access_code,
    };
  }

  // Calculate shipping cost for manufacturer order
  async calculateShipping(orderId: string) {
    const order = await this.getOrderById(orderId);

    // Get manufacturer delivery details (sender)
    const manufacturer = await this.prisma.profile.findUnique({
      where: { id: order.manufacturerId },
      select: {
        id: true,
        deliveryDetails: true,
        pickupMtaaniBusinessDetails: true,
      },
    });

    if (!manufacturer?.deliveryDetails) {
      throw new BadRequestException('Manufacturer delivery details not configured');
    }

    // Get retailer delivery details (receiver)
    const retailer = await this.prisma.profile.findUnique({
      where: { id: order.retailerId },
      select: {
        id: true,
        deliveryDetails: true,
      },
    });

    if (!retailer?.deliveryDetails) {
      throw new BadRequestException('Retailer delivery details not configured');
    }

    const manufacturerDelivery = typeof manufacturer.deliveryDetails === 'string'
      ? JSON.parse(manufacturer.deliveryDetails)
      : manufacturer.deliveryDetails;

    const retailerDelivery = typeof retailer.deliveryDetails === 'string'
      ? JSON.parse(retailer.deliveryDetails)
      : retailer.deliveryDetails;

    // Extract agent IDs based on delivery mode
    const deliveryMode = retailerDelivery.deliveryMode || 'agent';
    const senderAgentId = Number(manufacturerDelivery.agentId || manufacturerDelivery.deliveryDetails?.agentId);
    const receiverAgentId = deliveryMode === 'agent' 
      ? Number(retailerDelivery.agentId || retailerDelivery.deliveryDetails?.agentId)
      : undefined;
    const doorstepDestinationId = deliveryMode === 'door'
      ? Number(retailerDelivery.doorstepDestinationId)
      : undefined;

    if (!senderAgentId) {
      throw new BadRequestException('Manufacturer agent ID not found');
    }

    if (deliveryMode === 'agent' && !receiverAgentId) {
      throw new BadRequestException('Retailer receiver agent ID not found');
    }

    if (deliveryMode === 'door' && !doorstepDestinationId) {
      throw new BadRequestException('Retailer doorstep destination ID not found');
    }

    // Get business ID from manufacturer
    const businessDetails = manufacturer.pickupMtaaniBusinessDetails as any;
    const businessId = businessDetails?.businessId || businessDetails?.id;

    if (!businessId) {
      throw new BadRequestException('Manufacturer Pick Up Mtaani business ID not configured');
    }

    // Create a test package to calculate shipping
    // Note: Pick Up Mtaani API doesn't have a direct shipping calculator endpoint
    // We'll use a minimal package creation or estimate based on package value
    const packageValue = Number(order.totalAmount);
    
    // For now, return a default shipping cost calculation
    // In production, you might want to call Pick Up Mtaani API or use their pricing table
    const estimatedShipping = packageValue * 0.05; // 5% of order value as estimate

    console.log('📦 [MANUFACTURER_ORDER_SHIPPING] Calculated shipping for order:', orderId);
    console.log('📦 [MANUFACTURER_ORDER_SHIPPING] Package value:', packageValue);
    console.log('📦 [MANUFACTURER_ORDER_SHIPPING] Estimated shipping:', estimatedShipping);

    return {
      shippingCost: estimatedShipping,
      currency: order.currency || 'KES',
      senderAgentId,
      receiverAgentId,
      doorstepDestinationId,
      deliveryMode,
    };
  }

  // Create shipping package for manufacturer order
  async createShippingPackage(orderId: string) {
    const order = await this.getOrderById(orderId);

    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException('Order must be paid before creating shipping package');
    }

    // Get manufacturer and retailer details
    const manufacturer = await this.prisma.profile.findUnique({
      where: { id: order.manufacturerId },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        phone: true,
        email: true,
        deliveryDetails: true,
        pickupMtaaniBusinessDetails: true,
      },
    });

    const retailer = await this.prisma.profile.findUnique({
      where: { id: order.retailerId },
      select: {
        id: true,
        fullName: true,
        businessName: true,
        phone: true,
        email: true,
        deliveryDetails: true,
      },
    });

    if (!manufacturer || !retailer) {
      throw new NotFoundException('Manufacturer or retailer not found');
    }

    const manufacturerDelivery = typeof manufacturer.deliveryDetails === 'string'
      ? JSON.parse(manufacturer.deliveryDetails)
      : manufacturer.deliveryDetails;

    const retailerDelivery = typeof retailer.deliveryDetails === 'string'
      ? JSON.parse(retailer.deliveryDetails)
      : retailer.deliveryDetails;

    const deliveryMode = retailerDelivery.deliveryMode || 'agent';
    const senderAgentId = Number(manufacturerDelivery.agentId || manufacturerDelivery.deliveryDetails?.agentId);
    const receiverAgentId = deliveryMode === 'agent'
      ? Number(retailerDelivery.agentId || retailerDelivery.deliveryDetails?.agentId)
      : undefined;
    const doorstepDestinationId = deliveryMode === 'door'
      ? Number(retailerDelivery.doorstepDestinationId)
      : undefined;

    const businessDetails = manufacturer.pickupMtaaniBusinessDetails as any;
    const businessId = businessDetails?.businessId || businessDetails?.id;

    if (!businessId) {
      throw new BadRequestException('Manufacturer Pick Up Mtaani business ID not configured');
    }

    // Prepare package data
    const packageData: CreatePackageDto = {
      senderAgentId,
      receiverAgentId,
      packageValue: Number(order.totalAmount),
      customerName: retailer.businessName || retailer.fullName || 'Retailer',
      packageName: `${order.product.name} (${order.quantity} units)`,
      customerPhoneNumber: retailer.phone || '',
      paymentOption: 'vendor',
      on_delivery_balance: 0,
    };

    // Add door delivery fields if applicable
    if (deliveryMode === 'door') {
      packageData.doorstepDestinationId = doorstepDestinationId;
      packageData.lat = retailerDelivery.lat;
      packageData.lng = retailerDelivery.lng;
      packageData.locationDescription = retailerDelivery.locationDescription || retailerDelivery.address;
      packageData.paymentOption = retailerDelivery.paymentOption || 'vendor';
      if (packageData.paymentOption === 'customer') {
        packageData.payment_number = retailerDelivery.paymentNumber;
      }
    }

    console.log('📦 [MANUFACTURER_ORDER_SHIPPING] Creating package for order:', orderId);
    console.log('📦 [MANUFACTURER_ORDER_SHIPPING] Business ID:', businessId);
    console.log('📦 [MANUFACTURER_ORDER_SHIPPING] Delivery mode:', deliveryMode);

    // Create package via Pick Up Mtaani
    const packageResult = await this.pickupMtaaniService.createPackage(packageData, String(businessId));

    // Update order with shipping information
    const shippingAddress = {
      ...(order.shippingAddress as any || {}),
      packageId: packageResult.data.id,
      receiptNo: packageResult.data.receipt_no,
      trackingId: packageResult.data.trackId,
      trackingLink: packageResult.data.trackingLink,
      deliveryFee: packageResult.data.delivery_fee,
      state: packageResult.data.state,
      createdAt: packageResult.data.createdAt,
      senderAgentId: packageResult.data.senderAgentID_id,
      receiverAgentId: packageResult.data.receieverAgentID_id,
      deliveryMode,
    };

    await this.prisma.manufacturerOrder.update({
      where: { id: orderId },
      data: {
        shippingAddress: shippingAddress as any,
        trackingNumber: packageResult.data.trackId || packageResult.data.receipt_no,
      },
    });

    return {
      success: true,
      package: packageResult.data,
      shippingAddress,
    };
  }
}

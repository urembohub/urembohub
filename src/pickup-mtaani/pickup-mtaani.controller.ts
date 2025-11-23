import { Controller, Get, Post, UseGuards, Request, Logger, Body, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PickupMtaaniService } from './pickup-mtaani.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@Controller('pickup-mtaani')
export class PickupMtaaniController {
  private readonly logger = new Logger(PickupMtaaniController.name);

  constructor(
    private prisma: PrismaService,
    private pickupMtaaniService: PickupMtaaniService,
  ) {}

  /**
   * Normalize tracking link to ensure it has proper protocol
   * @param trackingLink The tracking link from Pick Up Mtaani
   * @returns Normalized tracking link with https:// protocol
   */
  private normalizeTrackingLink(trackingLink: string | undefined): string | undefined {
    if (!trackingLink) return undefined;
    
    // If it already has a protocol, return as is
    if (trackingLink.startsWith('http://') || trackingLink.startsWith('https://')) {
      return trackingLink;
    }
    
    // Add https:// protocol
    return `https://${trackingLink}`;
  }

  /**
   * Map Pick Up Mtaani state to manufacturer order status
   */
  private mapPickupMtaaniStateToManufacturerOrderStatus(
    state: string,
    paymentStatus?: string
  ): string | null {
    const normalizedState = state.toLowerCase().trim();

    // Map based on Pick Up Mtaani state
    switch (normalizedState) {
      case 'request':
      case 'pending':
        return 'confirmed' // Order is confirmed but package not yet picked up
      case 'paid':
        return 'confirmed' // Payment confirmed
      case 'picked_up':
      case 'in_transit':
      case 'in transit':
        return 'shipped' // Package is in transit
      case 'out_for_delivery':
        return 'shipped' // Out for delivery
      case 'delivered':
        return 'delivered' // Package delivered
      case 'cancelled':
        return 'cancelled' // Package cancelled
      case 'returned':
        return 'cancelled' // Package returned (treat as cancelled for now)
      default:
        return null // Don't update status if state is unknown
    }
  }

  /**
   * Create business on Pick Up Mtaani
   */
  @UseGuards(JwtAuthGuard)
  @Post('business')
  async createBusiness(@Request() req, @Body() createBusinessDto: CreateBusinessDto) {
    try {
      const userId = req.user.sub;
      this.logger.log(`🏢 [BUSINESS] Creating business for user: ${userId}`);

      // Create business on Pick Up Mtaani
      const result = await this.pickupMtaaniService.createBusiness(createBusinessDto);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to create business',
        };
      }

      // Update user profile with business details
      const businessDetails = {
        businessId: result.data.id,
        businessName: result.data.name,
        phoneNumber: result.data.phone_number,
        categoryId: result.data.business_categories.id,
        categoryName: result.data.business_categories.name,
        createdAt: result.data.createdAt,
      };

      this.logger.log(`🔍 [BUSINESS] Storing business details:`, JSON.stringify(businessDetails, null, 2));

      await this.prisma.profile.update({
        where: { id: userId },
        data: {
          pickupMtaaniBusinessDetails: businessDetails,
        },
      });

      this.logger.log(`✅ [BUSINESS] Business created and profile updated for user: ${userId}`);

      // Verify the data was stored correctly
      const updatedProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: { pickupMtaaniBusinessDetails: true }
      });

      this.logger.log(`🔍 [BUSINESS] Verification - stored business details:`, JSON.stringify(updatedProfile?.pickupMtaaniBusinessDetails, null, 2));

      return {
        success: true,
        data: result.data,
        message: 'Business created successfully',
      };

    } catch (error) {
      this.logger.error('❌ [BUSINESS] Error creating business:', error);
      return {
        success: false,
        error: 'Failed to create business',
      };
    }
  }

  /**
   * Get business categories
   */
  @UseGuards(JwtAuthGuard)
  @Get('business-categories')
  async getBusinessCategories() {
    try {
      this.logger.log('📋 [BUSINESS_CATEGORIES] Fetching business categories');

      const result = await this.pickupMtaaniService.listAllBusinesses();

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch business categories',
        };
      }

      return {
        success: true,
        data: result.data,
      };

    } catch (error) {
      this.logger.error('❌ [BUSINESS_CATEGORIES] Error fetching categories:', error);
      return {
        success: false,
        error: 'Failed to fetch business categories',
      };
    }
  }

  /**
   * Get delivery charge for doorstep package
   */
  @UseGuards(JwtAuthGuard)
  @Get('delivery-charge/doorstep')
  async getDoorstepDeliveryCharge(
    @Query('senderAgentId') senderAgentIdParam: string,
    @Query('senderAgentID') senderAgentIDParam: string,
    @Query('doorstepDestinationId') doorstepDestinationIdParam: string,
    @Query('doorstepDestinationID') doorstepDestinationIDParam: string,
  ) {
    try {
      const senderAgentId = Number(senderAgentIdParam || senderAgentIDParam)
      const doorstepDestinationId = Number(doorstepDestinationIdParam || doorstepDestinationIDParam)

      if (!senderAgentId || !doorstepDestinationId) {
        return {
          success: false,
          error: 'senderAgentId and doorstepDestinationId are required',
        }
      }

      this.logger.log(
        `💰 [DELIVERY_CHARGE] Fetching doorstep delivery charge: ${senderAgentId} → ${doorstepDestinationId}`
      )

      const charge = await this.pickupMtaaniService.getDoorstepDeliveryCharge(
        senderAgentId,
        doorstepDestinationId
      )

      return {
        success: true,
        data: { price: charge },
      }
    } catch (error) {
      this.logger.error('❌ [DELIVERY_CHARGE] Error fetching doorstep delivery charge:', error)
      return {
        success: false,
        error: 'Failed to fetch delivery charge',
      }
    }
  }

  /**
   * Initiate package payment (STK push)
   */
  @UseGuards(JwtAuthGuard)
  @Post('packages/:packageId/pay')
  async initiatePackagePayment(
    @Request() req,
    @Param('packageId') packageId: string,
    @Body() paymentData: {
      orderId: string;
      phone: string;
      businessId: number;
      type: string;
    }
  ) {
    try {
      const userId = req.user.sub;
      this.logger.log(`💳 [PACKAGE_PAYMENT] Initiating payment for package ${packageId} by user ${userId}`);

      // Validate required fields
      if (!paymentData.phone || !paymentData.businessId || !paymentData.type) {
        return {
          success: false,
          error: 'Missing required payment data (phone, businessId, type)',
        };
      }

      // Get retailer's business details
      const retailerProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: {
          pickupMtaaniBusinessDetails: true,
        },
      });

      if (!retailerProfile?.pickupMtaaniBusinessDetails) {
        return {
          success: false,
          error: 'Retailer has not completed Pickup Mtaani business setup',
        };
      }

      const businessDetails = retailerProfile.pickupMtaaniBusinessDetails as any;
      if (businessDetails.businessId !== paymentData.businessId) {
        return {
          success: false,
          error: 'Business ID mismatch',
        };
      }

      // Call Pick Up Mtaani's STK push API
      this.logger.log(`💳 [PACKAGE_PAYMENT] Initiating STK push via Pick Up Mtaani API`);
      
      const stkPushResponse = await this.pickupMtaaniService.initiateStkPush({
        packages: [{
          id: parseInt(packageId),
          type: paymentData.type
        }],
        phone: paymentData.phone,
        businessId: paymentData.businessId
      });

      if (!stkPushResponse.success) {
        return {
          success: false,
          error: stkPushResponse.error || 'Failed to initiate STK push',
        };
      }

      return {
        success: true,
        message: 'Payment request sent successfully. Please check your phone for M-Pesa prompt.',
        data: {
          packageId: parseInt(packageId),
          phone: paymentData.phone,
          businessId: paymentData.businessId,
          type: paymentData.type,
          stkResponse: stkPushResponse.data
        }
      };

    } catch (error) {
      this.logger.error('❌ [PACKAGE_PAYMENT] Error initiating payment:', error);
      return {
        success: false,
        error: 'Failed to initiate package payment',
      };
    }
  }

  /**
   * Get packages for the logged-in retailer
   * Supports optional type query parameter: ?type=outgoing (default) or ?type=incoming
   */
  @UseGuards(JwtAuthGuard)
  @Get('packages')
  async getRetailerPackages(@Request() req, @Query('type') type?: string) {
    // If type is 'incoming', redirect to incoming endpoint
    if (type === 'incoming') {
      return this.getRetailerIncomingPackages(req);
    }
    // Default to outgoing packages (existing behavior)
    try {
      const userId = req.user.sub;
      this.logger.log(`📦 [RETAILER_PACKAGES] Fetching packages for retailer: ${userId}`);

      // Get retailer's business ID
      const retailerProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: { 
          id: true,
          businessName: true,
          fullName: true,
          pickupMtaaniBusinessDetails: true,
        },
      });

      if (!retailerProfile) {
        return {
          success: false,
          error: 'Retailer profile not found',
          data: [],
        };
      }

      const businessDetails = retailerProfile.pickupMtaaniBusinessDetails as any;
      if (!businessDetails?.businessId) {
        return {
          success: false,
          error: 'Retailer has not completed Pickup Mtaani business setup',
          data: [],
        };
      }

      // Get all orders where this retailer has products
      this.logger.log(`📦 [RETAILER_PACKAGES] Querying orders for retailer ${userId}`);
    const orders = await this.prisma.order.findMany({
      where: {
        orderItems: {
          some: {
            product: {
                retailerId: userId,
              },
            },
          },
        },
        select: {
          id: true,
          status: true,
          customerEmail: true,
          customerPhone: true,
          shippingAddress: true,
          createdAt: true,
          orderItems: {
            where: {
              product: {
                retailerId: userId,
              },
            },
            select: {
              id: true,
              title: true,
              quantity: true,
              totalPrice: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`📦 [RETAILER_PACKAGES] Found ${orders.length} orders for retailer ${userId}`);

      // Extract packages from orders
      const packages = [];
    for (const order of orders) {
        const shippingAddress = order.shippingAddress as any;
        const orderPackages = shippingAddress?.pickupMtaaniPackages || [];

        this.logger.log(`📦 [RETAILER_PACKAGES] Order ${order.id} has ${orderPackages.length} packages`);
        if (orderPackages.length > 0) {
          this.logger.log(`📦 [RETAILER_PACKAGES] Package retailer IDs:`, orderPackages.map((pkg: any) => ({
            packageId: pkg.packageId,
            retailerId: pkg.retailerId,
            orderId: pkg.orderId,
            isDoorDelivery: !!pkg.doorstepDestinationId
          })));
        }

        // Filter packages for this retailer - match by retailerId OR if no retailerId but order belongs to this retailer
        const retailerPackages = orderPackages.filter(
          (pkg: any) => {
            // If package has retailerId, match by it
            if (pkg.retailerId) {
              return pkg.retailerId === userId;
            }
            // If no retailerId, check if this order belongs to this retailer
            // This handles legacy packages or packages without retailerId
            const orderItems = order.orderItems || [];
            return orderItems.some((item: any) => item.product?.retailerId === userId);
          }
        );
        
        this.logger.log(`📦 [RETAILER_PACKAGES] Found ${retailerPackages.length} packages for retailer ${userId} in order ${order.id}`);
        if (retailerPackages.length > 0) {
          this.logger.log(`📦 [RETAILER_PACKAGES] Package details:`, retailerPackages.map((pkg: any) => ({
            packageId: pkg.packageId,
            receiptNo: pkg.receiptNo,
            status: pkg.status,
            isDoorDelivery: !!pkg.doorstepDestinationId
          })));
        }

        for (const pkg of retailerPackages) {
          packages.push({
            packageId: pkg.packageId,
            receiptNo: pkg.receiptNo,
            status: pkg.status,
            paymentStatus: pkg.paymentStatus,
            trackingLink: pkg.trackingLink,
            deliveryFee: pkg.deliveryFee,
            packageValue: pkg.packageValue,
            packageName: pkg.packageName,
            customerName: pkg.customerName || order.customerEmail.split('@')[0],
            customerPhone: pkg.customerPhone || order.customerPhone,
            senderAgentId: pkg.senderAgentId,
            receiverAgentId: pkg.receiverAgentId,
            // Door delivery fields
            doorstepDestinationId: pkg.doorstepDestinationId,
            lat: pkg.lat,
            lng: pkg.lng,
            locationDescription: pkg.locationDescription,
            createdAt: pkg.createdAt || order.createdAt,
            updatedAt: pkg.updatedAt,
            items: pkg.items || order.orderItems.map(item => ({
              productId: item.product.id,
              productName: item.title || item.product.name,
              quantity: item.quantity,
              price: Number(item.totalPrice),
            })),
            orderId: order.id,
            orderStatus: order.status,
            businessId: businessDetails.businessId, // Add business ID to package data
            hasBusinessId: true, // Add flag to indicate business ID is available
          });
        }
      }

      this.logger.log(`📦 [RETAILER_PACKAGES] Found ${packages.length} packages for retailer ${userId}`);

      return {
        success: true,
        data: packages,
      };

    } catch (error) {
      this.logger.error('❌ [RETAILER_PACKAGES] Error fetching packages:', error);
      this.logger.error('❌ [RETAILER_PACKAGES] Error details:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.sub,
      });
      return {
        success: false,
        error: `Failed to fetch packages: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Get incoming packages for the logged-in retailer (from manufacturers)
   */
  @UseGuards(JwtAuthGuard)
  @Get('packages/incoming')
  async getRetailerIncomingPackages(@Request() req) {
    try {
      const userId = req.user.sub;
      this.logger.log(`📦 [RETAILER_INCOMING_PACKAGES] Fetching incoming packages for retailer: ${userId}`);

      // Get all manufacturer orders where this retailer is the recipient
      // Include orders that are paid, even if they don't have shippingAddress set yet
      const manufacturerOrders = await this.prisma.manufacturerOrder.findMany({
        where: {
          retailerId: userId,
          OR: [
            {
              shippingAddress: {
                not: null,
              },
            },
            {
              paymentStatus: 'paid',
            },
            {
              trackingNumber: {
                not: null,
              },
            },
          ],
        },
        include: {
          manufacturer: {
            select: {
              id: true,
              email: true,
              fullName: true,
              businessName: true,
              phone: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`📦 [RETAILER_INCOMING_PACKAGES] Found ${manufacturerOrders.length} manufacturer orders for retailer ${userId}`);

      // Extract packages from manufacturer orders
      const packages = [];
      for (const order of manufacturerOrders) {
        const shippingAddress = order.shippingAddress as any;
        
        // Include orders that are paid or have shipping info
        const shouldInclude = order.paymentStatus === 'paid' || shippingAddress?.packageId || shippingAddress?.receiptNo || order.trackingNumber;
        
        if (shouldInclude) {
          // Generate receiptNo if not available
          let receiptNo = shippingAddress?.receiptNo;
          if (!receiptNo) {
            if (order.trackingNumber) {
              receiptNo = order.trackingNumber;
            } else if (order.paystackReference) {
              receiptNo = `ORDER-${order.paystackReference.substring(0, 12)}`;
            } else {
              receiptNo = `ORDER-${order.id.substring(0, 8).toUpperCase()}`;
            }
          }

          packages.push({
            packageId: shippingAddress?.packageId || null,
            receiptNo: receiptNo,
            status: shippingAddress?.state || shippingAddress?.status || (order.paymentStatus === 'paid' ? 'pending_shipping' : 'pending'),
            paymentStatus: order.paymentStatus || 'pending',
            trackingLink: shippingAddress?.trackingLink || null,
            deliveryFee: shippingAddress?.deliveryFee || Number(order.shippingCost) || 0,
            packageValue: Number(order.totalAmount),
            packageName: `${order.product.name} (${order.quantity} units)`,
            customerName: order.manufacturer.businessName || order.manufacturer.fullName || 'Manufacturer',
            customerPhone: order.manufacturer.phone || '',
            senderAgentId: shippingAddress?.senderAgentId || null,
            receiverAgentId: shippingAddress?.receiverAgentId || null,
            createdAt: shippingAddress?.createdAt || order.createdAt,
            updatedAt: order.updatedAt,
            items: [
              {
                productId: order.product.id,
                productName: order.product.name,
                quantity: order.quantity,
                price: Number(order.totalAmount),
              },
            ],
            orderId: order.id,
            orderType: 'manufacturer_order',
            orderStatus: order.status,
            manufacturerId: order.manufacturer.id,
            manufacturerName: order.manufacturer.businessName || order.manufacturer.fullName,
            manufacturerEmail: order.manufacturer.email,
          });
        }
      }

      this.logger.log(`📦 [RETAILER_INCOMING_PACKAGES] Found ${packages.length} incoming packages for retailer ${userId}`);

      return {
        success: true,
        data: packages,
      };
    } catch (error) {
      this.logger.error('❌ [RETAILER_INCOMING_PACKAGES] Error fetching incoming packages:', error);
      this.logger.error('❌ [RETAILER_INCOMING_PACKAGES] Error details:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.sub,
      });
      return {
        success: false,
        error: `Failed to fetch incoming packages: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Get outgoing packages for the logged-in manufacturer (to retailers)
   */
  @UseGuards(JwtAuthGuard)
  @Get('manufacturer/packages')
  async getManufacturerPackages(@Request() req) {
    try {
      const userId = req.user.sub;
      this.logger.log(`📦 [MANUFACTURER_PACKAGES] Fetching packages for manufacturer: ${userId}`);

      // Get manufacturer's business ID
      const manufacturerProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: {
          id: true,
          businessName: true,
          fullName: true,
          pickupMtaaniBusinessDetails: true,
        },
      });

      if (!manufacturerProfile) {
        return {
          success: false,
          error: 'Manufacturer profile not found',
          data: [],
        };
      }

      // Get all manufacturer orders where this manufacturer is the sender
      // Include orders that are paid (have paymentStatus = 'paid') even if shippingAddress is not set yet
      const manufacturerOrders = await this.prisma.manufacturerOrder.findMany({
        where: {
          manufacturerId: userId,
          OR: [
            {
              shippingAddress: {
                not: null,
              },
            },
            {
              paymentStatus: 'paid',
            },
          ],
        },
        include: {
          retailer: {
            select: {
              id: true,
              email: true,
              fullName: true,
              businessName: true,
              phone: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      this.logger.log(`📦 [MANUFACTURER_PACKAGES] Found ${manufacturerOrders.length} manufacturer orders for manufacturer ${userId}`);

      // Extract packages from manufacturer orders
      const packages = [];
      for (const order of manufacturerOrders) {
        const shippingAddress = order.shippingAddress as any;
        
        this.logger.log(`📦 [MANUFACTURER_PACKAGES] Processing order ${order.id}:`, {
          paymentStatus: order.paymentStatus,
          hasShippingAddress: !!shippingAddress,
          packageId: shippingAddress?.packageId,
          receiptNo: shippingAddress?.receiptNo,
          trackingNumber: order.trackingNumber,
        });
        
        // Include orders that are paid, even if they don't have shipping package info yet
        // This ensures all paid orders show up, with or without shipping details
        const shouldInclude = order.paymentStatus === 'paid' || shippingAddress?.packageId || shippingAddress?.receiptNo || order.trackingNumber;
        
        if (shouldInclude) {
          // Generate receiptNo if not available
          let receiptNo = shippingAddress?.receiptNo;
          if (!receiptNo) {
            if (order.trackingNumber) {
              receiptNo = order.trackingNumber;
            } else if (order.paystackReference) {
              receiptNo = `ORDER-${order.paystackReference.substring(0, 12)}`;
            } else {
              receiptNo = `ORDER-${order.id.substring(0, 8).toUpperCase()}`;
            }
          }

          packages.push({
            packageId: shippingAddress?.packageId || null,
            receiptNo: receiptNo,
            status: shippingAddress?.state || shippingAddress?.status || (order.paymentStatus === 'paid' ? 'pending_shipping' : 'pending'),
            paymentStatus: order.paymentStatus || 'pending',
            trackingLink: shippingAddress?.trackingLink || null,
            deliveryFee: shippingAddress?.deliveryFee || Number(order.shippingCost) || 0,
            packageValue: Number(order.totalAmount),
            packageName: `${order.product.name} (${order.quantity} units)`,
            customerName: order.retailer.businessName || order.retailer.fullName || 'Retailer',
            customerPhone: order.retailer.phone || '',
            senderAgentId: shippingAddress?.senderAgentId || null,
            receiverAgentId: shippingAddress?.receiverAgentId || null,
            createdAt: shippingAddress?.createdAt || order.createdAt,
            updatedAt: order.updatedAt,
            items: [
              {
                productId: order.product.id,
                productName: order.product.name,
                quantity: order.quantity,
                price: Number(order.totalAmount),
              },
            ],
            orderId: order.id,
            orderType: 'manufacturer_order',
            orderStatus: order.status,
            retailerId: order.retailer.id,
            retailerName: order.retailer.businessName || order.retailer.fullName,
            retailerEmail: order.retailer.email,
          });
        }
      }

      this.logger.log(`📦 [MANUFACTURER_PACKAGES] Found ${packages.length} packages for manufacturer ${userId}`);

      return {
        success: true,
        data: packages,
      };
    } catch (error) {
      this.logger.error('❌ [MANUFACTURER_PACKAGES] Error fetching packages:', error);
      this.logger.error('❌ [MANUFACTURER_PACKAGES] Error details:', {
        message: error.message,
        stack: error.stack,
        userId: req.user?.sub,
      });
      return {
        success: false,
        error: `Failed to fetch packages: ${error.message}`,
        data: [],
      };
    }
  }

  /**
   * Get package details by ID
   */
  @UseGuards(JwtAuthGuard)
  @Get('packages/:packageId')
  async getPackageDetails(@Request() req, packageId: string) {
    try {
      const userId = req.user.sub;
      this.logger.log(`📦 [PACKAGE_DETAILS] Fetching details for package: ${packageId}`);

      // Get retailer's business ID
    const retailerProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: { pickupMtaaniBusinessDetails: true },
      });

      if (!retailerProfile?.pickupMtaaniBusinessDetails) {
      return {
        success: false,
          error: 'Retailer business setup not found',
        };
      }

      const businessDetails = retailerProfile.pickupMtaaniBusinessDetails as any;
      const businessId = businessDetails.businessId.toString();

      // Fetch fresh data from Pick Up Mtaani
      const packageData = await this.pickupMtaaniService.getPackageByIdentifier(
        packageId,
        businessId
      );

    if (!packageData) {
      return {
        success: false,
          error: 'Package not found',
        };
    }

    return {
      success: true,
      data: packageData,
      };

    } catch (error) {
      this.logger.error('❌ [PACKAGE_DETAILS] Error fetching package details:', error);
      return {
        success: false,
        error: 'Failed to fetch package details',
      };
    }
  }

  /**
   * Refresh package status from Pick Up Mtaani
   */
  @UseGuards(JwtAuthGuard)
  @Get('packages/:packageId/refresh')
  async refreshPackageStatus(@Request() req, packageId: string) {
    try {
      const userId = req.user.sub;
      this.logger.log(`🔄 [PACKAGE_REFRESH] Refreshing status for package: ${packageId}`);

      // Get retailer's business ID
      const retailerProfile = await this.prisma.profile.findUnique({
        where: { id: userId },
        select: { pickupMtaaniBusinessDetails: true },
      });

      if (!retailerProfile?.pickupMtaaniBusinessDetails) {
        return {
          success: false,
          error: 'Retailer business setup not found',
        };
      }

      const businessDetails = retailerProfile.pickupMtaaniBusinessDetails as any;
      const businessId = businessDetails.businessId.toString();

      // Fetch fresh data from Pick Up Mtaani
      const packageData = await this.pickupMtaaniService.getPackageByIdentifier(
        packageId,
        businessId
      );

      if (!packageData) {
        return {
          success: false,
          error: 'Package not found in Pick Up Mtaani',
        };
      }

      // Find and update the order with fresh package data (regular orders)
      const orders = await this.prisma.order.findMany({
        where: {
          orderItems: {
            some: {
              product: {
                retailerId: userId,
              },
            },
          },
        },
        select: {
          id: true,
          shippingAddress: true,
        },
      });

      let foundInOrder = false;
      for (const order of orders) {
        const shippingAddress = (order.shippingAddress as any) || {};
        const packages = shippingAddress.pickupMtaaniPackages || [];

        const packageIndex = packages.findIndex(
          (pkg: any) => pkg.packageId === parseInt(packageId)
        );

        if (packageIndex >= 0) {
          // Update package data
          packages[packageIndex] = {
            ...packages[packageIndex],
            status: packageData.state,
            paymentStatus: packageData.payment_status,
            trackingLink: this.normalizeTrackingLink(packageData.trackingLink),
            updatedAt: packageData.createdAt,
            deliveryFee: packageData.delivery_fee,
            receiptNo: packageData.receipt_no,
          };

          // Update order
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              shippingAddress: {
                ...shippingAddress,
                pickupMtaaniPackages: packages,
              },
              packageStatus: packageData.state,
              packageTrackingId: packageData.trackId,
              packageReceiptNo: packageData.receipt_no,
              packageTrackingLink: this.normalizeTrackingLink(packageData.trackingLink),
              packageTrackingHistory: 
                packageData.door_step_package_tracks?.descriptions || 
                packageData.agent_package_tracks?.descriptions || 
                [],
            },
          });

          this.logger.log(`✅ [PACKAGE_REFRESH] Updated package ${packageId} in order ${order.id}`);
          foundInOrder = true;
          break;
        }
      }

      // If not found in regular orders, check manufacturer orders
      if (!foundInOrder) {
        const manufacturerOrders = await this.prisma.manufacturerOrder.findMany({
          where: {
            OR: [
              { retailerId: userId },
              { manufacturerId: userId },
            ],
          },
          select: {
            id: true,
            shippingAddress: true,
            manufacturerId: true,
            retailerId: true,
          },
        });

        for (const manufacturerOrder of manufacturerOrders) {
          const shippingAddress = (manufacturerOrder.shippingAddress as any) || {};
          
          // Check if this manufacturer order has the packageId
          if (shippingAddress?.packageId === parseInt(packageId)) {
            // Get manufacturer's business ID for the API call
            const manufacturerProfile = await this.prisma.profile.findUnique({
              where: { id: manufacturerOrder.manufacturerId },
              select: { pickupMtaaniBusinessDetails: true },
            });

            const manufacturerBusinessDetails = manufacturerProfile?.pickupMtaaniBusinessDetails as any;
            const manufacturerBusinessId = manufacturerBusinessDetails?.businessId?.toString();

            // Fetch fresh data using manufacturer's business ID
            const freshPackageData = manufacturerBusinessId 
              ? await this.pickupMtaaniService.getPackageByIdentifier(
                  packageId,
                  manufacturerBusinessId
                )
              : packageData;

            // Get full manufacturer order to access trackingNumber and status
            const fullManufacturerOrder = await this.prisma.manufacturerOrder.findUnique({
              where: { id: manufacturerOrder.id },
              select: {
                id: true,
                trackingNumber: true,
                status: true,
              },
            });

            // Update manufacturer order shippingAddress
            const updatedShippingAddress = {
              ...shippingAddress,
              state: freshPackageData.state,
              status: freshPackageData.state,
              paymentStatus: freshPackageData.payment_status || shippingAddress.paymentStatus,
              trackingLink: this.normalizeTrackingLink(freshPackageData.trackingLink || shippingAddress.trackingLink),
              trackingId: freshPackageData.trackId || shippingAddress.trackingId,
              receiptNo: freshPackageData.receipt_no || shippingAddress.receiptNo,
              deliveryFee: freshPackageData.delivery_fee || shippingAddress.deliveryFee,
              senderAgentId: freshPackageData.senderAgentID_id || freshPackageData.agent_id || shippingAddress.senderAgentId,
              receiverAgentId: freshPackageData.receieverAgentID_id || shippingAddress.receiverAgentId,
              updatedAt: new Date().toISOString(),
            };

            // Map Pick Up Mtaani state to manufacturer order status
            const newOrderStatus = this.mapPickupMtaaniStateToManufacturerOrderStatus(
              freshPackageData.state,
              freshPackageData.payment_status
            );

            // Update manufacturer order
            await this.prisma.manufacturerOrder.update({
              where: { id: manufacturerOrder.id },
              data: {
                shippingAddress: updatedShippingAddress as any,
                trackingNumber: freshPackageData.trackId || freshPackageData.receipt_no || fullManufacturerOrder?.trackingNumber,
                status: newOrderStatus || fullManufacturerOrder?.status,
              },
            });

            this.logger.log(`✅ [PACKAGE_REFRESH] Updated package ${packageId} in manufacturer order ${manufacturerOrder.id}`);
            foundInOrder = true;
            break;
          }
        }
      }

      if (!foundInOrder) {
        this.logger.warn(`⚠️ [PACKAGE_REFRESH] Package ${packageId} not found in any order or manufacturer order`);
      }

      return {
        success: true,
        data: packageData,
        message: 'Package status refreshed successfully',
      };

    } catch (error) {
      this.logger.error('❌ [PACKAGE_REFRESH] Error refreshing package status:', error);
      return {
        success: false,
        error: 'Failed to refresh package status',
      };
    }
  }

  /**
   * Webhook endpoint for Pick Up Mtaani payment confirmation
   * This endpoint is called when payment is confirmed for a package
   * It should not require authentication as it's called by Pick Up Mtaani
   */
  @Post('webhook/payment-confirmation')
  async handlePaymentConfirmation(@Body() webhookData: {
    packageId?: number;
    receiptNo?: string;
    orderId?: string;
    paymentStatus?: string;
    paymentConfirmed?: boolean;
    amount?: number;
    [key: string]: any;
  }) {
    try {
      this.logger.log('💳 [PAYMENT_WEBHOOK] Received payment confirmation webhook:', JSON.stringify(webhookData, null, 2));

      // Extract package identifier from webhook data
      const packageId = webhookData.packageId;
      const receiptNo = webhookData.receiptNo;
      const orderId = webhookData.orderId;

      if (!packageId && !receiptNo && !orderId) {
        this.logger.error('❌ [PAYMENT_WEBHOOK] Missing package identifier in webhook data');
        return {
          success: false,
          error: 'Missing package identifier (packageId, receiptNo, or orderId)',
        };
      }

      // Find orders with paymentDueAtDoor: true
      // First, get all orders with paymentDueAtDoor: true
      const allPaymentDueOrders = await this.prisma.order.findMany({
        where: {
          paymentDueAtDoor: true,
        } as any,
        include: {
          orderItems: true,
        },
      });

      // Then filter by matching package ID or receipt number in shippingAddress
      const orders = allPaymentDueOrders.filter(order => {
        // If orderId is provided and matches, include it
        if (orderId && order.id === orderId) {
          return true;
        }

        // Otherwise, check shippingAddress for matching package
        const shippingAddress = order.shippingAddress as any;
        const packages = shippingAddress?.pickupMtaaniPackages || [];

        return packages.some((pkg: any) => {
          if (packageId && pkg.packageId === packageId) return true;
          if (receiptNo && pkg.receiptNo === receiptNo) return true;
          return false;
        });
      });

      this.logger.log(`💳 [PAYMENT_WEBHOOK] Found ${orders.length} orders matching criteria`);

      if (orders.length === 0) {
        // Also try to find by package ID in shippingAddress
        const allOrdersWithPaymentDue = await this.prisma.order.findMany({
          where: {
            paymentDueAtDoor: true,
          } as any,
          include: {
            orderItems: true,
          },
        });

        // Search through shippingAddress for matching packages
        for (const order of allOrdersWithPaymentDue) {
          const shippingAddress = order.shippingAddress as any;
          const packages = shippingAddress?.pickupMtaaniPackages || [];

          const matchingPackage = packages.find((pkg: any) => {
            if (packageId && pkg.packageId === packageId) return true;
            if (receiptNo && pkg.receiptNo === receiptNo) return true;
            return false;
          });

          if (matchingPackage) {
            orders.push(order);
            break;
          }
        }
      }

      if (orders.length === 0) {
        this.logger.warn('⚠️ [PAYMENT_WEBHOOK] No orders found with paymentDueAtDoor matching package criteria');
        return {
          success: false,
          error: 'No matching orders found',
        };
      }

      // Update each matching order
      const updatedOrders = [];
      for (const order of orders) {
        this.logger.log(`💳 [PAYMENT_WEBHOOK] Updating order ${order.id} - marking payment as confirmed`);

        const updatedOrder = await this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentDueAtDoor: false,
            paymentStatus: 'completed',
            paidAt: new Date(),
            // Optionally update status to processing if it was pending
            ...(order.status === 'pending' ? { status: 'processing' } : {}),
          } as any,
        });

        updatedOrders.push(updatedOrder.id);
        this.logger.log(`✅ [PAYMENT_WEBHOOK] Updated order ${order.id} - payment confirmed`);
      }

      return {
        success: true,
        message: `Payment confirmed for ${updatedOrders.length} order(s)`,
        data: {
          updatedOrderIds: updatedOrders,
        },
      };

    } catch (error) {
      this.logger.error('❌ [PAYMENT_WEBHOOK] Error processing payment confirmation:', error);
      return {
        success: false,
        error: 'Failed to process payment confirmation',
      };
    }
  }
}
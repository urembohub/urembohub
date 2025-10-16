import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PickupMtaaniService } from './pickup-mtaani.service';

@Controller('api/pickup-mtaani')
@UseGuards(JwtAuthGuard)
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
   * Get packages for the logged-in retailer
   */
  @Get('packages')
  async getRetailerPackages(@Request() req) {
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

        // Filter packages for this retailer
        const retailerPackages = orderPackages.filter(
          (pkg: any) => pkg.retailerId === userId
        );

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
   * Get package details by ID
   */
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

      // Find and update the order with fresh package data
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
              packageTrackingHistory: packageData.agent_package_tracks?.descriptions || [],
            },
          });

          this.logger.log(`✅ [PACKAGE_REFRESH] Updated package ${packageId} in order ${order.id}`);
        }
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
}
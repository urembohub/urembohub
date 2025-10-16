import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { PickupMtaaniService } from './pickup-mtaani.service';
import { PackageTrackingJobData } from './package-tracking-queue.service';

@Processor('package-tracking')
export class PackageTrackingProcessor {
  private readonly logger = new Logger(PackageTrackingProcessor.name);

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

  @Process('track-package')
  async handlePackageTracking(job: Job<PackageTrackingJobData>) {
    const { orderId, packageId, businessId, retailerId, retailerName, customerEmail, customerName, retryCount = 0 } = job.data;

    this.logger.log(
      `📦 [PACKAGE_TRACKING] Processing package ${packageId} for order ${orderId} (attempt ${retryCount + 1})`
    );

    try {
      // Fetch current package status from Pick Up Mtaani
      const packageData = await this.pickupMtaaniService.getPackageByIdentifier(packageId, businessId);

      if (!packageData) {
        this.logger.warn(`⚠️ [PACKAGE_TRACKING] Package ${packageId} not found in Pick Up Mtaani`);
        throw new Error(`Package ${packageId} not found`);
      }

      this.logger.log(`📦 [PACKAGE_TRACKING] Package ${packageId} status: ${packageData.state}, payment: ${packageData.payment_status}`);

      // Get the order to update
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          shippingAddress: true,
          retailerId: true,
        },
      });

      if (!order) {
        this.logger.error(`❌ [PACKAGE_TRACKING] Order ${orderId} not found`);
        throw new Error(`Order ${orderId} not found`);
      }

      // Update package data in order's shippingAddress
      const shippingAddress = (order.shippingAddress as any) || {};
      const packages = shippingAddress.pickupMtaaniPackages || [];

      // Find and update the specific package
      const packageIndex = packages.findIndex((pkg: any) => pkg.packageId === packageId);
      if (packageIndex >= 0) {
        packages[packageIndex] = {
          ...packages[packageIndex],
          status: packageData.state,
          paymentStatus: packageData.payment_status,
          trackingLink: this.normalizeTrackingLink(packageData.trackingLink),
          updatedAt: packageData.createdAt,
          // Add any other fields from Pick Up Mtaani response
          deliveryFee: packageData.delivery_fee,
          receiptNo: packageData.receipt_no,
        };
      }

      // Update the order with new package data
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          shippingAddress: {
            ...shippingAddress,
            pickupMtaaniPackages: packages,
          },
          // Update package tracking fields for the first package (for backward compatibility)
          packageStatus: packageData.state,
          packageTrackingId: packageData.trackId,
          packageReceiptNo: packageData.receipt_no,
          packageTrackingLink: this.normalizeTrackingLink(packageData.trackingLink),
          packageTrackingHistory: packageData.agent_package_tracks?.descriptions || [],
        },
      });

      // Map Pick Up Mtaani state to Order status
      const newOrderStatus = this.mapPickupMtaaniStateToOrderStatus(packageData.state, packageData.payment_status);

      // Update order status if it should change
      if (newOrderStatus && newOrderStatus !== order.status) {
        await this.prisma.order.update({
          where: { id: orderId },
          data: { status: newOrderStatus },
        });

        this.logger.log(`📦 [PACKAGE_TRACKING] Order ${orderId} status updated to: ${newOrderStatus}`);
      }

      // Check if we should schedule another tracking job
      if (this.shouldContinueTracking(packageData.state)) {
        // Schedule next check in 30 seconds for demo
        await this.scheduleNextTracking(job.data, 30 * 1000);
      } else {
        this.logger.log(`📦 [PACKAGE_TRACKING] Package ${packageId} reached final state: ${packageData.state}`);
      }

      this.logger.log(`✅ [PACKAGE_TRACKING] Successfully updated package ${packageId} for order ${orderId}`);

    } catch (error) {
      this.logger.error(
        `❌ [PACKAGE_TRACKING] Failed to track package ${packageId} for order ${orderId}:`,
        error.message
      );

      // Retry logic is handled by Bull queue configuration
      throw error;
    }
  }

  /**
   * Map Pick Up Mtaani state to Order status
   */
  private mapPickupMtaaniStateToOrderStatus(pickupState: string, paymentStatus: string): string | null {
    // If payment is not completed, don't change order status yet
    if (paymentStatus !== 'paid') {
      return null;
    }

    switch (pickupState) {
      case 'request':
        return 'confirmed'; // Ready for pickup
      case 'pending':
        return 'processing'; // Being processed
      case 'in_transit':
        return 'shipped'; // In transit
      case 'delivered':
        return 'delivered'; // Delivered
      case 'cancelled':
      case 'failed':
        return 'cancelled'; // Failed/cancelled
      default:
        return null; // Unknown state, don't change
    }
  }

  /**
   * Determine if we should continue tracking this package
   */
  private shouldContinueTracking(pickupState: string): boolean {
    const finalStates = ['delivered', 'cancelled', 'failed'];
    return !finalStates.includes(pickupState);
  }

  /**
   * Schedule the next tracking check
   */
  private async scheduleNextTracking(jobData: PackageTrackingJobData, delay: number): Promise<void> {
    // This would typically be handled by the queue service
    // For now, we'll just log that we would schedule it
    this.logger.log(
      `📦 [PACKAGE_TRACKING] Would schedule next tracking for package ${jobData.packageId} in ${delay}ms`
    );
  }
}

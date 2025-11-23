import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { PickupMtaaniService } from '../pickup-mtaani.service';
import { EmailService } from '../../email/email.service';
import { PackageTrackingJobData } from '../package-tracking-queue.service';

@Processor('package-tracking')
export class PackageTrackingProcessor {
  private readonly logger = new Logger(PackageTrackingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private pickupMtaaniService: PickupMtaaniService,
    private emailService: EmailService,
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
    const { orderId, packageId, businessId, retailerId, retailerName, customerEmail, customerName } = job.data;
    
    // Determine if this is a door delivery package
    const isDoorDelivery = job.data.isDoorDelivery !== undefined ? job.data.isDoorDelivery : undefined;
    const deliveryType = isDoorDelivery === true ? '🚪 DOOR DELIVERY' : isDoorDelivery === false ? '🚚 AGENT PICKUP' : '❓ UNKNOWN';
    
    this.logger.log(
      `📦 [PACKAGE_TRACKING] Processing package ${packageId} for order ${orderId} ${deliveryType} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
    );

    try {
      // Get current package status from Pickup Mtaani
      // Use isDoorDelivery flag if available, otherwise let it try both endpoints
      const packageStatusResponse = await this.pickupMtaaniService.getPackageStatus(packageId, businessId, isDoorDelivery);
      
      if (!packageStatusResponse || !packageStatusResponse.data) {
        throw new Error('Invalid package status response from Pickup Mtaani');
      }

      const packageData = packageStatusResponse.data;
      const currentState = packageData.state;
      const paymentStatus = packageData.payment_status;
      const trackingId = packageData.trackId;
      const receiptNo = packageData.receipt_no;
      const trackingLink = packageData.trackingLink;
      
      // Map the correct field names from API response
      // Doorstep packages use agent_id (single), agent-agent use senderAgentID_id/receieverAgentID_id
      const receiverAgentId = packageData.receieverAgentID_id || (packageData.type === 'doorstep' ? null : undefined);
      const senderAgentId = packageData.senderAgentID_id || packageData.agent_id; // Doorstep uses agent_id

      this.logger.log(
        `📦 [PACKAGE_TRACKING] Package ${packageId} - State: ${currentState}, Payment: ${paymentStatus}, Tracking: ${trackingLink}`
      );
      
      // Debug: Log the full package data to see what we're getting
      this.logger.log(`🔍 [PACKAGE_TRACKING] Full package data:`, JSON.stringify(packageData, null, 2));

      // Check if this is a manufacturer order
      const isManufacturerOrder = job.data.isManufacturerOrder === true;

      if (isManufacturerOrder) {
        // Update manufacturer order with package status information
        await this.updateManufacturerOrderPackageStatus(orderId, {
          packageStatus: currentState,
          paymentStatus: paymentStatus,
          packageTrackingId: trackingId,
          packageReceiptNo: receiptNo,
          packageTrackingLink: this.normalizeTrackingLink(trackingLink),
        }, packageStatusResponse.data); // Pass full response for history
      } else {
        // Update regular order with package status information
        await this.updateOrderPackageStatus(orderId, {
          packageStatus: currentState,
          paymentStatus: paymentStatus,
          packageTrackingId: trackingId,
          packageReceiptNo: receiptNo,
          packageTrackingLink: this.normalizeTrackingLink(trackingLink),
        }, packageStatusResponse.data); // Pass full response for history
      }

      // Check if package is in a final state
      const finalStates = ['delivered', 'cancelled', 'returned'];
      const isFinalState = finalStates.includes(currentState.toLowerCase());

      // Check if payment is verified (this triggers ready_for_shipping status)
      const isPaymentVerified = paymentStatus === 'paid';

      if (isFinalState) {
        this.logger.log(
          `✅ [PACKAGE_TRACKING] Package ${packageId} reached final state: ${currentState}`
        );

        // Send delivery notification if delivered
        if (currentState.toLowerCase() === 'delivered') {
          await this.sendDeliveryNotification(customerEmail, customerName, orderId, packageData);
        }

        // Mark job as completed
        return { success: true, finalState: currentState, paymentStatus };
      } else if (isPaymentVerified && currentState === 'request') {
        // Payment is verified but package is still in request state
        // This means it's ready for shipping, so we can reduce check frequency
        this.logger.log(
          `🚚 [PACKAGE_TRACKING] Package ${packageId} payment verified, ready for shipping (${currentState})`
        );

        // Check less frequently since payment is done
        const nextCheckDelay = 60 * 1000; // 1 minute for demo
        
        this.logger.log(
          `⏰ [PACKAGE_TRACKING] Package ${packageId} ready for shipping, next check in ${Math.round(nextCheckDelay / 1000)} seconds`
        );

        // Reschedule the job with longer delay
        throw new Error(`Package ready for shipping: ${currentState}`);
      } else {
        // Package is still in progress, reschedule for next check
        const nextCheckDelay = this.calculateNextCheckDelay(currentState, job.attemptsMade);
        
        this.logger.log(
          `⏰ [PACKAGE_TRACKING] Package ${packageId} in progress (${currentState}), next check in ${Math.round(nextCheckDelay / 1000)} seconds`
        );

        // Reschedule the job
        throw new Error(`Package still in progress: ${currentState}`);
      }

    } catch (error) {
      this.logger.error(
        `❌ [PACKAGE_TRACKING] Error tracking package ${packageId}:`,
        error.message
      );

      // If this is the last attempt, mark as failed and notify
      if (job.attemptsMade >= (job.opts.attempts || 10) - 1) {
        await this.handleTrackingFailure(orderId, packageId, retailerId, retailerName, error.message);
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Update order with package status information
   */
  private async updateOrderPackageStatus(orderId: string, packageData: any, fullPackageResponse: any) {
    try {
      // First, get the current order to update the package in shippingAddress
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          shippingAddress: true,
        },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      const shippingAddress = (order.shippingAddress as any) || {};
      const packages = shippingAddress.pickupMtaaniPackages || [];
      const packageId = fullPackageResponse.id;

      // Find and update the specific package in the array
      const packageIndex = packages.findIndex((pkg: any) => pkg.packageId === packageId);
      if (packageIndex >= 0) {
        // Update package with fresh data from Pick Up Mtaani
        packages[packageIndex] = {
          ...packages[packageIndex],
          status: packageData.packageStatus,
          paymentStatus: packageData.paymentStatus,
          trackingLink: packageData.packageTrackingLink,
          packageTrackingLink: packageData.packageTrackingLink,
          packageTrackingId: packageData.packageTrackingId,
          packageReceiptNo: packageData.packageReceiptNo,
          deliveryFee: fullPackageResponse.delivery_fee || packages[packageIndex].deliveryFee,
          receiptNo: fullPackageResponse.receipt_no || packages[packageIndex].receiptNo,
          updatedAt: fullPackageResponse.createdAt || new Date().toISOString(),
          // Update agent IDs - handle both agent-agent and doorstep packages
          senderAgentId: fullPackageResponse.senderAgentID_id || fullPackageResponse.agent_id || packages[packageIndex].senderAgentId,
          receiverAgentId: fullPackageResponse.receieverAgentID_id || packages[packageIndex].receiverAgentId,
          // Update doorstep fields if present
          doorstepDestinationId: fullPackageResponse.doorstep_destination_id || packages[packageIndex].doorstepDestinationId,
          type: fullPackageResponse.type || packages[packageIndex].type,
        };
        
        this.logger.log(`✅ [PACKAGE_TRACKING] Updated package ${packageId} in shippingAddress array`);
      } else {
        this.logger.warn(`⚠️ [PACKAGE_TRACKING] Package ${packageId} not found in shippingAddress.pickupMtaaniPackages`);
      }

      // Extract tracking history from response
      // Doorstep packages use door_step_package_tracks, agent-agent use agent_package_tracks
      const trackingHistory = 
        fullPackageResponse.door_step_package_tracks?.descriptions || 
        fullPackageResponse.agent_package_tracks?.descriptions || 
        [];
      
      // Debug: Log what we're about to save
      this.logger.log(`🔍 [PACKAGE_TRACKING] About to update order ${orderId} with:`, {
        packageStatus: packageData.packageStatus,
        paymentStatus: packageData.paymentStatus,
        packageTrackingId: packageData.packageTrackingId,
        packageReceiptNo: packageData.packageReceiptNo,
        packageTrackingLink: packageData.packageTrackingLink,
        trackingHistoryLength: trackingHistory.length,
        deliveryFee: fullPackageResponse.delivery_fee
      });
      
      // Check if payment is verified and update order status to ready_for_shipping
      const isPaymentVerified = packageData.paymentStatus === 'paid';
      let orderStatusUpdate = {};
      let paymentStatusUpdate = {};
      
      if (isPaymentVerified) {
        orderStatusUpdate = { status: 'ready_for_shipping' };
        paymentStatusUpdate = { paymentStatus: 'paid' }; // Update payment status to paid when Pick Up Mtaani confirms
        this.logger.log(`🚚 [PACKAGE_TRACKING] Payment verified for order ${orderId}, updating status to ready_for_shipping and payment status to paid`);
      }

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          // Update order-level fields (for backward compatibility)
          packageStatus: packageData.packageStatus,
          paymentStatus: packageData.paymentStatus,
          packageTrackingId: packageData.packageTrackingId,
          packageReceiptNo: packageData.packageReceiptNo,
          packageTrackingLink: packageData.packageTrackingLink,
          packageTrackingHistory: trackingHistory, // Store full tracking history
          deliveryFee: fullPackageResponse.delivery_fee || null,
          // Update shippingAddress with updated packages array
          shippingAddress: {
            ...shippingAddress,
            pickupMtaaniPackages: packages,
          },
          ...orderStatusUpdate, // Include order status update if payment is verified
          ...paymentStatusUpdate, // Include payment status update if payment is verified
        },
      });

      this.logger.log(`✅ [PACKAGE_TRACKING] Updated order ${orderId} - State: ${packageData.packageStatus}, Payment: ${packageData.paymentStatus}${isPaymentVerified ? ', Status: ready_for_shipping' : ''}`);
    } catch (error) {
      this.logger.error(`❌ [PACKAGE_TRACKING] Failed to update order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate delay for next check based on current state
   */
  private calculateNextCheckDelay(currentState: string, attemptCount: number): number {
    // Base delay: 30-60 seconds for demo purposes
    const baseDelay = 30 * 1000; // 30 seconds
    const randomExtra = Math.floor(Math.random() * 30 * 1000); // 0-30 seconds random
    
    // For early states, check more frequently
    if (currentState === 'request' || currentState === 'pending') {
      return 30 * 1000; // 30 seconds for initial states
    }
    
    // For active delivery states, use standard interval
    return baseDelay + randomExtra; // 30-60 seconds
  }

  /**
   * Send delivery notification to customer
   */
  private async sendDeliveryNotification(
    customerEmail: string,
    customerName: string,
    orderId: string,
    packageData: any
  ) {
    try {
      await this.emailService.sendPackageDeliveredEmail(
        customerEmail,
        customerName,
        orderId,
        packageData.receipt_no,
        packageData.trackingLink
      );
      
      this.logger.log(`📧 [PACKAGE_TRACKING] Delivery notification sent to ${customerEmail}`);
    } catch (error) {
      this.logger.error(`❌ [PACKAGE_TRACKING] Failed to send delivery notification:`, error);
    }
  }

  /**
   * Update manufacturer order with package status information
   */
  private async updateManufacturerOrderPackageStatus(
    manufacturerOrderId: string,
    packageData: any,
    fullPackageResponse: any
  ) {
    try {
      const manufacturerOrder = await this.prisma.manufacturerOrder.findUnique({
        where: { id: manufacturerOrderId },
        select: {
          id: true,
          shippingAddress: true,
          status: true,
          trackingNumber: true,
        },
      });

      if (!manufacturerOrder) {
        throw new Error(`Manufacturer order ${manufacturerOrderId} not found`);
      }

      const shippingAddress = (manufacturerOrder.shippingAddress as any) || {};
      const packageId = fullPackageResponse.id;

      // Update shippingAddress with fresh data from Pick Up Mtaani
      const updatedShippingAddress = {
        ...shippingAddress,
        packageId: packageId,
        state: packageData.packageStatus,
        status: packageData.packageStatus,
        paymentStatus: packageData.paymentStatus || shippingAddress.paymentStatus,
        trackingLink: packageData.packageTrackingLink || shippingAddress.trackingLink,
        trackingId: packageData.packageTrackingId || shippingAddress.trackingId,
        receiptNo: packageData.packageReceiptNo || shippingAddress.receiptNo,
        deliveryFee: fullPackageResponse.delivery_fee || shippingAddress.deliveryFee,
        senderAgentId: fullPackageResponse.senderAgentID_id || fullPackageResponse.agent_id || shippingAddress.senderAgentId,
        receiverAgentId: fullPackageResponse.receieverAgentID_id || shippingAddress.receiverAgentId,
        updatedAt: new Date().toISOString(),
        lastUpdatedFromApi: new Date().toISOString(),
      };

      // Map Pick Up Mtaani state to manufacturer order status
      const newOrderStatus = this.mapPickupMtaaniStateToManufacturerOrderStatus(
        packageData.packageStatus,
        packageData.paymentStatus
      );

      // Update manufacturer order
      await this.prisma.manufacturerOrder.update({
        where: { id: manufacturerOrderId },
        data: {
          shippingAddress: updatedShippingAddress as any,
          trackingNumber: packageData.packageTrackingId || packageData.packageReceiptNo || manufacturerOrder.trackingNumber,
          status: newOrderStatus || manufacturerOrder.status,
        },
      });

      this.logger.log(
        `✅ [PACKAGE_TRACKING] Updated manufacturer order ${manufacturerOrderId} package ${packageId} - State: ${packageData.packageStatus}, Payment: ${packageData.paymentStatus}`
      );
    } catch (error) {
      this.logger.error(
        `❌ [PACKAGE_TRACKING] Failed to update manufacturer order ${manufacturerOrderId}:`,
        error
      );
      throw error;
    }
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
   * Handle tracking failure after all retries exhausted
   */
  private async handleTrackingFailure(
    orderId: string,
    packageId: number,
    retailerId: string,
    retailerName: string,
    errorMessage: string
  ) {
    try {
      // Check if this is a manufacturer order by trying to find it
      const manufacturerOrder = await this.prisma.manufacturerOrder.findUnique({
        where: { id: orderId },
      });

      if (manufacturerOrder) {
        // Update manufacturer order with failure status
        await this.prisma.manufacturerOrder.update({
          where: { id: orderId },
          data: {
            status: 'cancelled', // Treat tracking failure as cancelled for manufacturer orders
          },
        });
      } else {
        // Update regular order with failure status
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            packageStatus: 'tracking_failed',
          },
        });
      }

      // Send failure notification to admin
      await this.emailService.sendPackageTrackingFailedEmail(
        'admin@urembohub.com', // This should come from config
        orderId,
        packageId,
        retailerName,
        errorMessage
      );

      this.logger.error(
        `❌ [PACKAGE_TRACKING] Package ${packageId} tracking failed after all retries`
      );
    } catch (error) {
      this.logger.error(`❌ [PACKAGE_TRACKING] Failed to handle tracking failure:`, error);
    }
  }
}

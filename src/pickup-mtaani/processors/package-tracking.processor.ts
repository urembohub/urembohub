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
    
    this.logger.log(
      `📦 [PACKAGE_TRACKING] Processing package ${packageId} for order ${orderId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
    );

    try {
      // Get current package status from Pickup Mtaani
      const packageStatusResponse = await this.pickupMtaaniService.getPackageStatus(packageId, businessId);
      
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
      const receiverAgentId = packageData.receieverAgentID_id; // Note: API has typo
      const senderAgentId = packageData.senderAgentID_id;     // Note: API has typo

      this.logger.log(
        `📦 [PACKAGE_TRACKING] Package ${packageId} - State: ${currentState}, Payment: ${paymentStatus}, Tracking: ${trackingLink}`
      );
      
      // Debug: Log the full package data to see what we're getting
      this.logger.log(`🔍 [PACKAGE_TRACKING] Full package data:`, JSON.stringify(packageData, null, 2));

      // Update order with package status information and full response
      await this.updateOrderPackageStatus(orderId, {
        packageStatus: currentState,
        paymentStatus: paymentStatus,
        packageTrackingId: trackingId,
        packageReceiptNo: receiptNo,
        packageTrackingLink: this.normalizeTrackingLink(trackingLink),
      }, packageStatusResponse.data); // Pass full response for history

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
        const nextCheckDelay = 15 * 60 * 1000; // 15 minutes
        
        this.logger.log(
          `⏰ [PACKAGE_TRACKING] Package ${packageId} ready for shipping, next check in ${Math.round(nextCheckDelay / 60000)} minutes`
        );

        // Reschedule the job with longer delay
        throw new Error(`Package ready for shipping: ${currentState}`);
      } else {
        // Package is still in progress, reschedule for next check
        const nextCheckDelay = this.calculateNextCheckDelay(currentState, job.attemptsMade);
        
        this.logger.log(
          `⏰ [PACKAGE_TRACKING] Package ${packageId} in progress (${currentState}), next check in ${Math.round(nextCheckDelay / 60000)} minutes`
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
      // Extract tracking history from response
      const trackingHistory = fullPackageResponse.agent_package_tracks?.descriptions || [];
      
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
          packageStatus: packageData.packageStatus,
          paymentStatus: packageData.paymentStatus,
          packageTrackingId: packageData.packageTrackingId,
          packageReceiptNo: packageData.packageReceiptNo,
          packageTrackingLink: packageData.packageTrackingLink,
          packageTrackingHistory: trackingHistory, // Store full tracking history
          deliveryFee: fullPackageResponse.delivery_fee || null,
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
    // Base delay: 10-15 minutes for all states
    const baseDelay = 10 * 60 * 1000; // 10 minutes
    const randomExtra = Math.floor(Math.random() * 5 * 60 * 1000); // 0-5 minutes random
    
    // For early states, check more frequently
    if (currentState === 'request' || currentState === 'pending') {
      return 5 * 60 * 1000; // 5 minutes for initial states
    }
    
    // For active delivery states, use standard interval
    return baseDelay + randomExtra; // 10-15 minutes
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
      // Update order with failure status
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          packageStatus: 'tracking_failed',
        },
      });

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

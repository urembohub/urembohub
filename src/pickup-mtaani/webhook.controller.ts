import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  HttpStatus,
  HttpException,
} from "@nestjs/common"
import { PaymentVerificationService } from "./payment-verification.service"
import { PickupMtaaniWebhookPayload } from "./dto/webhook.dto"

/**
 * Webhook Controller for Pick Up Mtaani Events
 * Handles instant payment notifications and package status updates
 */
@Controller("webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)

  constructor(private paymentVerificationService: PaymentVerificationService) {}

  /**
   * Webhook endpoint for Pick Up Mtaani events
   * Receives instant notifications when payment completes or package status changes
   *
   * @public - No JWT guard as this is called by external service
   */
  @Post("pickup-mtaani")
  async handlePickupMtaaniWebhook(
    @Body() payload: PickupMtaaniWebhookPayload,
    @Headers("x-webhook-signature") signature?: string
  ) {
    const startTime = Date.now()

    this.logger.log(
      `📥 [WEBHOOK] Received event: ${payload.event} for package ${payload.data?.id}`
    )

    try {
      // 1. Validate webhook signature (security)
      if (!this.validateWebhookSignature(payload, signature)) {
        this.logger.warn(
          `⚠️ [WEBHOOK] Invalid signature for event: ${payload.event}`
        )
        throw new HttpException(
          "Invalid webhook signature",
          HttpStatus.UNAUTHORIZED
        )
      }

      // 2. Validate payload structure
      if (!this.validateWebhookPayload(payload)) {
        this.logger.warn(
          `⚠️ [WEBHOOK] Invalid payload structure for event: ${payload.event}`
        )
        throw new HttpException(
          "Invalid webhook payload",
          HttpStatus.BAD_REQUEST
        )
      }

      // 3. Process webhook based on event type
      await this.processWebhookEvent(payload)

      const duration = Date.now() - startTime
      this.logger.log(
        `✅ [WEBHOOK] Processed ${payload.event} in ${duration}ms`
      )

      return {
        success: true,
        message: "Webhook processed successfully",
        event: payload.event,
        package_id: payload.data?.id,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.logger.error(
        `❌ [WEBHOOK] Error processing event ${payload.event}:`,
        error.message
      )
      this.logger.error(error.stack)

      // Return 200 to prevent Pick Up Mtaani from retrying
      // (we've logged the error for manual investigation)
      return {
        success: false,
        message: "Webhook received but processing failed",
        error: error.message,
        duration_ms: duration,
      }
    }
  }

  /**
   * Validate webhook signature
   * TODO: Implement actual signature validation based on Pick Up Mtaani docs
   */
  private validateWebhookSignature(
    payload: PickupMtaaniWebhookPayload,
    signature?: string
  ): boolean {
    // For now, accept all webhooks
    // In production, verify signature using secret key

    // Example implementation:
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.PICKUP_MTAANI_WEBHOOK_SECRET)
    //   .update(JSON.stringify(payload))
    //   .digest('hex');
    // return signature === expectedSignature;

    this.logger.debug(
      `🔐 [WEBHOOK] Signature validation: ${signature ? "Present" : "Missing"}`
    )

    return true // Always true for now - update when Pick Up Mtaani provides signature method
  }

  /**
   * Validate webhook payload structure
   */
  private validateWebhookPayload(payload: PickupMtaaniWebhookPayload): boolean {
    if (!payload || !payload.event || !payload.data) {
      return false
    }

    if (!payload.data.id || !payload.data.state) {
      return false
    }

    return true
  }

  /**
   * Process webhook event based on type
   */
  private async processWebhookEvent(payload: PickupMtaaniWebhookPayload) {
    const { event, data } = payload

    this.logger.log(
      `🔄 [WEBHOOK] Processing ${event} for package ${data.id} (status: ${data.state})`
    )

    switch (event) {
      case "payment.completed":
      case "package.updated":
        // Payment completed or package status changed
        await this.handlePaymentCompletion(data)
        break

      case "package.in_transit":
        await this.handlePackageInTransit(data)
        break

      case "package.delivered":
        await this.handlePackageDelivered(data)
        break

      case "payment.failed":
        await this.handlePaymentFailed(data)
        break

      default:
        this.logger.log(`ℹ️ [WEBHOOK] Unhandled event type: ${event}`)
    }
  }

  /**
   * Handle payment completion webhook
   */
  private async handlePaymentCompletion(data: any) {
    this.logger.log(
      `💰 [WEBHOOK] Payment completed for package ${data.id}, transaction: ${data.transaction_code || "N/A"}`
    )

    try {
      // Use verification service to process instant payment
      await this.paymentVerificationService.processWebhookPayment(
        data.id,
        data.state,
        data.transaction_code,
        data
      )

      this.logger.log(
        `✅ [WEBHOOK] Successfully processed payment for package ${data.id}`
      )
    } catch (error) {
      this.logger.error(
        `❌ [WEBHOOK] Error processing payment for package ${data.id}:`,
        error.message
      )
      throw error
    }
  }

  /**
   * Handle package in transit webhook
   */
  private async handlePackageInTransit(data: any) {
    this.logger.log(`🚚 [WEBHOOK] Package ${data.id} is now in transit`)

    // Update package status
    await this.paymentVerificationService.updatePackageStatusFromWebhook(
      data.id,
      "in_transit",
      data
    )
  }

  /**
   * Handle package delivered webhook
   */
  private async handlePackageDelivered(data: any) {
    this.logger.log(`📦 [WEBHOOK] Package ${data.id} has been delivered`)

    // Update package status
    await this.paymentVerificationService.updatePackageStatusFromWebhook(
      data.id,
      "delivered",
      data
    )
  }

  /**
   * Handle payment failed webhook
   */
  private async handlePaymentFailed(data: any) {
    this.logger.warn(`❌ [WEBHOOK] Payment failed for package ${data.id}`)

    // Mark verification as failed
    await this.paymentVerificationService.markPaymentAsFailed(
      data.id,
      "Payment failed via webhook notification"
    )
  }
}


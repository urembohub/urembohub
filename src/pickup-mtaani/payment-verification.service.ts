import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { PrismaService } from "../prisma/prisma.service"
import { PickupMtaaniService } from "./pickup-mtaani.service"

@Injectable()
export class PaymentVerificationService {
  private readonly logger = new Logger(PaymentVerificationService.name)
  private isRunning = false // Prevent overlapping cron executions

  constructor(
    private prisma: PrismaService,
    private pickupMtaaniService: PickupMtaaniService
  ) {}

  /**
   * ==========================================
   * WEBHOOK PROCESSING METHODS (INSTANT)
   * ==========================================
   */

  /**
   * Process payment completion from webhook
   * This is the PRIMARY verification method (instant)
   */
  async processWebhookPayment(
    packageId: number,
    status: string,
    transactionCode?: string,
    packageData?: any
  ) {
    this.logger.log(
      `⚡ [WEBHOOK] Processing instant payment for package ${packageId}`
    )

    try {
      // Find pending verification
      const verification = await this.prisma.paymentVerificationQueue.findFirst(
        {
          where: {
            packageId,
            status: "pending",
          },
        }
      )

      if (!verification) {
        this.logger.warn(
          `⚠️ [WEBHOOK] No pending verification found for package ${packageId}`
        )
        // Still update order if we have the data
        if (packageData && this.isPackagePaid({ state: status })) {
          await this.updatePackageStatusDirectly(packageId, status, packageData)
        }
        return
      }

      // Check if payment is confirmed
      if (this.isPackagePaid({ state: status })) {
        this.logger.log(
          `✅ [WEBHOOK] Package ${packageId} payment CONFIRMED via webhook!`
        )

        // Update verification status
        await this.prisma.paymentVerificationQueue.update({
          where: { id: verification.id },
          data: {
            status: "verified",
            verifiedAt: new Date(),
            transcode: transactionCode || verification.transcode,
            errorMessage: null,
          },
        })

        // Update package status in order
        await this.updatePackageStatusInOrder(
          verification.orderId,
          packageId,
          packageData || { state: status, transaction_code: transactionCode }
        )

        this.logger.log(
          `⚡ [WEBHOOK] Instant verification complete for package ${packageId}`
        )
      }
    } catch (error) {
      this.logger.error(
        `❌ [WEBHOOK] Error processing webhook payment for package ${packageId}:`,
        error.message
      )
      throw error
    }
  }

  /**
   * Update package status from webhook (for status changes like in_transit, delivered)
   */
  async updatePackageStatusFromWebhook(
    packageId: number,
    status: string,
    packageData: any
  ) {
    this.logger.log(
      `🔄 [WEBHOOK] Updating package ${packageId} status to: ${status}`
    )

    try {
      await this.updatePackageStatusDirectly(packageId, status, packageData)
      this.logger.log(
        `✅ [WEBHOOK] Package ${packageId} status updated successfully`
      )
    } catch (error) {
      this.logger.error(
        `❌ [WEBHOOK] Error updating package ${packageId} status:`,
        error.message
      )
      throw error
    }
  }

  /**
   * Mark payment as failed from webhook
   */
  async markPaymentAsFailed(packageId: number, reason: string) {
    this.logger.warn(
      `❌ [WEBHOOK] Marking package ${packageId} payment as failed: ${reason}`
    )

    try {
      const verification = await this.prisma.paymentVerificationQueue.findFirst(
        {
          where: {
            packageId,
            status: "pending",
          },
        }
      )

      if (verification) {
        await this.prisma.paymentVerificationQueue.update({
          where: { id: verification.id },
          data: {
            status: "failed",
            errorMessage: reason,
          },
        })
      }
    } catch (error) {
      this.logger.error(
        `❌ [WEBHOOK] Error marking payment as failed:`,
        error.message
      )
    }
  }

  /**
   * Update package status directly (find order by packageId)
   */
  private async updatePackageStatusDirectly(
    packageId: number,
    status: string,
    packageData: any
  ) {
    // Find order containing this package
    const orders = await this.prisma.order.findMany({
      where: {
        status: {
          in: ["confirmed", "processing", "shipped", "completed", "delivered"],
        },
      },
    })

    for (const order of orders) {
      const shippingAddress = (order.shippingAddress as any) || {}
      const packages = shippingAddress?.pickupMtaaniPackages || []

      const packageIndex = packages.findIndex(
        (pkg: any) => pkg.packageId === packageId
      )

      if (packageIndex !== -1) {
        // Found the order with this package
        await this.updatePackageStatusInOrder(order.id, packageId, {
          state: status,
          ...packageData,
        })
        return
      }
    }

    this.logger.warn(
      `⚠️ [WEBHOOK] No order found containing package ${packageId}`
    )
  }

  /**
   * ==========================================
   * CRON JOB (BACKUP FOR MISSED WEBHOOKS)
   * ==========================================
   *
   * TEMPORARILY DISABLED - Uncomment to re-enable backup verification
   */

  /**
   * Run every 30 seconds to check pending payments
   * NOW ACTS AS BACKUP: Only checks if webhook hasn't updated in 2 minutes
   *
   * DISABLED: Uncomment @Cron decorator to re-enable
   */
  // @Cron(CronExpression.EVERY_30_SECONDS)
  async verifyPendingPayments() {
    if (this.isRunning) {
      this.logger.debug(
        "🔄 [CRON] Previous verification still running, skipping..."
      )
      return
    }

    this.isRunning = true
    this.logger.debug("🔍 [CRON-BACKUP] Starting backup verification check...")

    try {
      // Get pending verifications that haven't been checked by webhook recently
      // Only check if lastCheckedAt is older than 2 minutes (webhook might have missed)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

      const pendingVerifications =
        await this.prisma.paymentVerificationQueue.findMany({
          where: {
            status: "pending",
            initiatedAt: {
              gte: tenMinutesAgo,
            },
            lastCheckedAt: {
              lt: twoMinutesAgo, // Only check if not recently updated (webhook backup)
            },
          },
          take: 10, // Process max 10 at a time to avoid overload
        })

      if (pendingVerifications.length === 0) {
        this.logger.debug(
          "✅ [CRON-BACKUP] No stale verifications found (webhooks working!)"
        )
        return
      }

      this.logger.log(
        `⚠️ [CRON-BACKUP] Found ${pendingVerifications.length} stale verifications (webhook might have missed these)`
      )

      // Process each verification
      let verifiedCount = 0
      let failedCount = 0
      let expiredCount = 0

      for (const verification of pendingVerifications) {
        // Check if exceeded max attempts
        if (verification.attempts >= verification.maxAttempts) {
          await this.markAsExpired(verification)
          expiredCount++
          continue
        }

        const result = await this.verifyPayment(verification)
        if (result === "verified") verifiedCount++
        else if (result === "failed") failedCount++
      }

      this.logger.log(
        `✅ [CRON] Verification check complete: ${verifiedCount} verified, ${failedCount} pending, ${expiredCount} expired`
      )
    } catch (error) {
      this.logger.error("❌ [CRON] Error in verification job:", error.message)
      this.logger.error(error.stack)
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Verify a single payment
   */
  private async verifyPayment(
    verification: any
  ): Promise<"verified" | "pending" | "failed"> {
    this.logger.log(
      `🔍 [VERIFY] Checking package ${verification.packageId} (attempt ${verification.attempts + 1}/${verification.maxAttempts})`
    )

    try {
      // Update attempts count
      await this.prisma.paymentVerificationQueue.update({
        where: { id: verification.id },
        data: {
          attempts: verification.attempts + 1,
          lastCheckedAt: new Date(),
        },
      })

      // Get package status from Pick Up Mtaani
      const packageData = await this.pickupMtaaniService.getPackageByIdentifier(
        verification.packageId.toString()
      )

      if (!packageData) {
        this.logger.debug(
          `⏳ [VERIFY] Package ${verification.packageId} not found in Pick Up Mtaani yet`
        )
        return "pending"
      }

      // Check if payment is confirmed (status changed to paid/in_transit/etc)
      if (this.isPackagePaid(packageData)) {
        this.logger.log(
          `✅ [VERIFY] Package ${verification.packageId} payment is CONFIRMED!`
        )

        // Update verification status
        await this.prisma.paymentVerificationQueue.update({
          where: { id: verification.id },
          data: {
            status: "verified",
            verifiedAt: new Date(),
          },
        })

        // Update package status in order
        await this.updatePackageStatusInOrder(
          verification.orderId,
          verification.packageId,
          packageData
        )

        this.logger.log(
          `✅ [VERIFY] Successfully updated package ${verification.packageId} status`
        )

        return "verified"
      } else {
        this.logger.debug(
          `⏳ [VERIFY] Package ${verification.packageId} not yet paid (status: ${packageData.state})`
        )
        return "pending"
      }
    } catch (error) {
      this.logger.error(
        `❌ [VERIFY] Error verifying package ${verification.packageId}:`,
        error.message
      )

      // Update error message
      await this.prisma.paymentVerificationQueue.update({
        where: { id: verification.id },
        data: {
          errorMessage: error.message,
        },
      })

      return "failed"
    }
  }

  /**
   * Check if package is paid based on its status
   */
  private isPackagePaid(packageData: any): boolean {
    if (!packageData || !packageData.state) {
      return false
    }

    // Statuses that indicate payment is complete
    const paidStatuses = [
      "paid",
      "in_transit",
      "in transit",
      "processing",
      "confirmed",
      "accepted",
      "dispatched",
      "delivered",
    ]

    const status = packageData.state.toLowerCase().replace(/[_\s-]/g, "")
    return paidStatuses.some((paidStatus) =>
      status.includes(paidStatus.replace(/[_\s-]/g, ""))
    )
  }

  /**
   * Update package status in order's shippingAddress JSON
   */
  private async updatePackageStatusInOrder(
    orderId: string,
    packageId: number,
    packageData: any
  ) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        this.logger.error(`❌ [UPDATE] Order ${orderId} not found`)
        return
      }

      const shippingAddress = (order.shippingAddress as any) || {}
      const packages = shippingAddress?.pickupMtaaniPackages || []

      const packageIndex = packages.findIndex(
        (pkg: any) => pkg.packageId === packageId
      )

      if (packageIndex === -1) {
        this.logger.error(
          `❌ [UPDATE] Package ${packageId} not found in order ${orderId}`
        )
        return
      }

      // Update package with payment verification info
      packages[packageIndex] = {
        ...packages[packageIndex],
        status: packageData.state || "paid",
        paymentVerified: true,
        paymentVerifiedAt: new Date().toISOString(),
        lastUpdatedFromApi: new Date().toISOString(),
        deliveryFee:
          packageData.delivery_fee || packages[packageIndex].deliveryFee,
      }

      // Update order
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          shippingAddress: {
            ...shippingAddress,
            pickupMtaaniPackages: packages,
          },
        },
      })

      this.logger.log(
        `✅ [UPDATE] Updated package ${packageId} in order ${orderId}`
      )
    } catch (error) {
      this.logger.error(
        `❌ [UPDATE] Error updating package in order:`,
        error.message
      )
      throw error
    }
  }

  /**
   * Mark verification as expired
   */
  private async markAsExpired(verification: any) {
    this.logger.warn(
      `⏰ [EXPIRE] Package ${verification.packageId} verification expired after ${verification.attempts} attempts`
    )

    await this.prisma.paymentVerificationQueue.update({
      where: { id: verification.id },
      data: {
        status: "expired",
        errorMessage: `Verification expired after ${verification.maxAttempts} attempts (${verification.maxAttempts * 30} seconds)`,
      },
    })
  }

  /**
   * Cleanup old verifications (run daily at midnight)
   * Removes verifications older than 30 days
   *
   * DISABLED: Uncomment @Cron decorator to re-enable
   */
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldVerifications() {
    this.logger.log("🧹 [CLEANUP] Starting cleanup of old verifications...")

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      const result = await this.prisma.paymentVerificationQueue.deleteMany({
        where: {
          initiatedAt: {
            lt: thirtyDaysAgo,
          },
        },
      })

      this.logger.log(
        `🧹 [CLEANUP] Successfully removed ${result.count} old verification records`
      )
    } catch (error) {
      this.logger.error("❌ [CLEANUP] Error during cleanup:", error.message)
    }
  }

  /**
   * Manual verification trigger (can be called via API endpoint if needed)
   */
  async manualVerify(packageId: number): Promise<boolean> {
    this.logger.log(
      `🔍 [MANUAL] Manual verification requested for package ${packageId}`
    )

    try {
      const verification = await this.prisma.paymentVerificationQueue.findFirst(
        {
          where: {
            packageId,
            status: "pending",
          },
        }
      )

      if (!verification) {
        this.logger.warn(
          `⚠️ [MANUAL] No pending verification found for package ${packageId}`
        )
        return false
      }

      const result = await this.verifyPayment(verification)
      return result === "verified"
    } catch (error) {
      this.logger.error(
        `❌ [MANUAL] Error in manual verification:`,
        error.message
      )
      return false
    }
  }

  /**
   * Get verification status for a package
   */
  async getVerificationStatus(packageId: number) {
    return this.prisma.paymentVerificationQueue.findFirst({
      where: { packageId },
      orderBy: { initiatedAt: "desc" },
    })
  }
}

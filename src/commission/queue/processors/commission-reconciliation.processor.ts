import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@/queue/queues.constant';
import { PrismaService } from '@/prisma/prisma.service';
import { PaymentVerificationService } from '../payment-verification.service';

@Processor(QUEUE_NAMES.COMMISSION_RECONCILIATION)
export class CommissionReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(CommissionReconciliationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private paymentVerificationService: PaymentVerificationService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { name, data } = job;

    this.logger.log(`Processing job: ${name} with data:`, data);

    switch (name) {
      case 'reconcile-commission':
        return await this.reconcileCommission(data);
      case 'manual-reconcile-all':
        return await this.reconcileAllPending();
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }

  private async reconcileCommission(data: {
    commissionTransactionId: string;
    paystackReference: string;
  }) {
    // 1. Get commission transaction
    const commission = await this.prisma.commissionTransaction.findUnique({
      where: { id: data.commissionTransactionId },
    });

    if (!commission || commission.paymentStatus !== 'processing') {
      this.logger.log(`Commission ${data.commissionTransactionId} already processed or not in processing status`);
      return { status: 'already_processed' };
    }

    // 2. Query Paystack for payment status (not transfer status)
    try {
      const paymentStatus = await this.paymentVerificationService.verifyPayment(
        data.paystackReference
      );

      // 3. Update commission based on payment status
      if (paymentStatus.success && paymentStatus.data.status === 'success') {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            paymentStatus: 'completed',
            processedAt: new Date(),
            metadata: {
              ...(commission.metadata as any || {}),
              reconciliationType: 'automated',
              reconciledAt: new Date().toISOString(),
              paymentVerification: paymentStatus,
            },
          },
        });

        this.logger.log(`✅ Commission ${commission.id} reconciled as completed`);
        return { status: 'completed', commissionId: commission.id };
      } else if (!paymentStatus.success || paymentStatus.data.status === 'failed') {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            paymentStatus: 'failed',
            metadata: {
              ...(commission.metadata as any || {}),
              reconciliationType: 'automated',
              reconciledAt: new Date().toISOString(),
              failureReason: paymentStatus.error || 'Payment verification failed',
            },
          },
        });

        this.logger.error(`❌ Commission ${commission.id} reconciled as failed`);
        return { status: 'failed', commissionId: commission.id };
      } else {
        // Still pending/processing
        this.logger.log(`⏳ Commission ${commission.id} still pending on Paystack`);
        return { status: 'pending', commissionId: commission.id };
      }
    } catch (error) {
      this.logger.error(`Error reconciling commission ${commission.id}:`, error);
      
      // If payment verification fails, mark as failed after multiple attempts
      const attemptCount = (commission.metadata as any)?.reconciliationAttempts || 0;
      if (attemptCount >= 2) {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            paymentStatus: 'failed',
            metadata: {
              ...(commission.metadata as any || {}),
              reconciliationType: 'automated',
              reconciledAt: new Date().toISOString(),
              failureReason: 'Payment verification failed after multiple attempts',
              reconciliationAttempts: attemptCount + 1,
            },
          },
        });

        this.logger.error(`❌ Commission ${commission.id} marked as failed after ${attemptCount + 1} attempts`);
        return { status: 'failed', commissionId: commission.id };
      } else {
        // Increment attempt count and retry later
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            metadata: {
              ...(commission.metadata as any || {}),
              reconciliationAttempts: attemptCount + 1,
              lastReconciliationAttempt: new Date().toISOString(),
            },
          },
        });

        this.logger.log(`⏳ Commission ${commission.id} will retry reconciliation (attempt ${attemptCount + 1})`);
        return { status: 'pending', commissionId: commission.id };
      }
    }
  }

  private async reconcileAllPending() {
    // Get all pending commissions older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const pendingCommissions = await this.prisma.commissionTransaction.findMany({
      where: {
        paymentStatus: 'processing',
        createdAt: {
          lt: fiveMinutesAgo,
        },
      },
    });

    this.logger.log(`Found ${pendingCommissions.length} pending commissions to reconcile`);

    const results = [];
    for (const commission of pendingCommissions) {
      const reference = (commission.metadata as any)?.paystackReference;
      if (reference) {
        const result = await this.reconcileCommission({
          commissionTransactionId: commission.id,
          paystackReference: reference,
        });
        results.push(result);
      }
    }

    return {
      total: pendingCommissions.length,
      results,
    };
  }
}

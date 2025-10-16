import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@/queue/queues.constant';

@Injectable()
export class CommissionQueueService {
  private readonly logger = new Logger(CommissionQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.COMMISSION_RECONCILIATION)
    private reconciliationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMISSION_PROCESSING)
    private processingQueue: Queue,
  ) {}

  // Add commission for processing
  async addCommissionForProcessing(data: {
    orderId: string;
    commissionTransactionId: string;
    paystackReference: string;
  }) {
    await this.processingQueue.add('process-commission', data, {
      delay: 5000, // 5 second delay to allow Paystack to process
    });
  }

  // Schedule reconciliation job
  async scheduleReconciliation(data: {
    commissionTransactionId: string;
    paystackReference: string;
  }) {
    await this.reconciliationQueue.add('reconcile-commission', data, {
      repeat: {
        every: 60000, // Check every 1 minute
        limit: 60, // Try for 1 hour max
      },
    });
  }

  // Manual reconciliation trigger
  async triggerManualReconciliation() {
    await this.reconciliationQueue.add('manual-reconcile-all', {});
  }

  // Add reconciliation job for a specific commission
  async addReconciliationJob(data: {
    commissionTransactionId: string;
    paystackReference: string;
  }) {
    await this.reconciliationQueue.add('reconcile-commission', data, {
      delay: 30000, // Wait 30 seconds before reconciliation
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}

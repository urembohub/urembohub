import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@/queue/queues.constant';
import { PrismaService } from '@/prisma/prisma.service';
import { CommissionQueueService } from '../commission-queue.service';

@Processor(QUEUE_NAMES.COMMISSION_PROCESSING)
export class CommissionProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(CommissionProcessingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private commissionQueueService: CommissionQueueService,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { name, data } = job;

    this.logger.log(`Processing job: ${name} with data:`, data);

    switch (name) {
      case 'process-commission':
        return await this.processCommission(data);
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }

  private async processCommission(data: {
    orderId: string;
    commissionTransactionId: string;
    paystackReference: string;
  }) {
    this.logger.log(`Processing commission ${data.commissionTransactionId} for order ${data.orderId}`);

    // Get the commission transaction details
    const commission = await this.prisma.commissionTransaction.findUnique({
      where: { id: data.commissionTransactionId },
      include: {
        businessUser: true,
      },
    });

    if (!commission) {
      this.logger.error(`Commission ${data.commissionTransactionId} not found`);
      throw new Error(`Commission ${data.commissionTransactionId} not found`);
    }

    // Update commission status to processing
    await this.prisma.commissionTransaction.update({
      where: { id: data.commissionTransactionId },
      data: {
        paymentStatus: 'processing',
        metadata: {
          paystackReference: data.paystackReference,
          processingStartedAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(`✅ Commission ${data.commissionTransactionId} marked as processing`);

    // For now, we'll use a simple approach:
    // 1. If it's a retailer commission (immediate), mark as completed
    // 2. If it's a vendor commission (needs settlement), schedule reconciliation
    
    const isRetailerCommission = commission.businessUser?.role === 'retailer';
    
    if (isRetailerCommission) {
      // Retailer commissions are immediate - mark as completed
      await this.prisma.commissionTransaction.update({
        where: { id: data.commissionTransactionId },
        data: {
          paymentStatus: 'completed',
          processedAt: new Date(),
          metadata: {
            paystackReference: data.paystackReference,
            processingStartedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            completionType: 'immediate',
          },
        },
      });

      this.logger.log(`✅ Commission ${data.commissionTransactionId} completed immediately (retailer)`);
      
      return {
        status: 'completed',
        commissionId: data.commissionTransactionId,
        orderId: data.orderId,
        completionType: 'immediate',
      };
    } else {
      // Vendor commissions need settlement - schedule reconciliation
      await this.commissionQueueService.addReconciliationJob({
        commissionTransactionId: data.commissionTransactionId,
        paystackReference: data.paystackReference,
      });

      this.logger.log(`⏳ Commission ${data.commissionTransactionId} scheduled for reconciliation (vendor)`);
      
      return {
        status: 'processing',
        commissionId: data.commissionTransactionId,
        orderId: data.orderId,
        completionType: 'scheduled_reconciliation',
      };
    }
  }
}

import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@/queue/queues.constant';
import { CommissionReconciliationProcessor } from './processors/commission-reconciliation.processor';
import { CommissionProcessingProcessor } from './processors/commission-processing.processor';
import { CommissionQueueService } from './commission-queue.service';
import { CommissionReconciliationCron } from './commission-reconciliation.cron';
import { BullBoardService } from '@/queue/bull-board.service';
import { CommissionQueueRegistrationService } from './commission-queue-registration.service';
import { PaymentVerificationService } from './payment-verification.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.COMMISSION_RECONCILIATION },
      { name: QUEUE_NAMES.COMMISSION_PROCESSING },
    ),
  ],
  providers: [
    CommissionReconciliationProcessor,
    CommissionProcessingProcessor,
    CommissionQueueService,
    CommissionReconciliationCron,
    BullBoardService,
    CommissionQueueRegistrationService,
    PaymentVerificationService,
  ],
  exports: [CommissionQueueService, BullBoardService],
})
export class CommissionQueueModule {}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@/queue/queues.constant';
import { BullBoardRegistryService } from '@/queue/bull-board-registry.service';

@Injectable()
export class CommissionQueueRegistrationService implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUE_NAMES.COMMISSION_RECONCILIATION)
    private reconciliationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMISSION_PROCESSING)
    private processingQueue: Queue,
    private bullBoardRegistry: BullBoardRegistryService,
  ) {}

  onModuleInit() {
    // Register commission queues with Bull Board
    this.bullBoardRegistry.registerQueue(
      QUEUE_NAMES.COMMISSION_RECONCILIATION,
      this.reconciliationQueue
    );
    this.bullBoardRegistry.registerQueue(
      QUEUE_NAMES.COMMISSION_PROCESSING,
      this.processingQueue
    );
  }
}

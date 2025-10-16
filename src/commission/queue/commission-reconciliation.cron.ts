import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CommissionQueueService } from './commission-queue.service';

@Injectable()
export class CommissionReconciliationCron {
  private readonly logger = new Logger(CommissionReconciliationCron.name);

  constructor(private commissionQueueService: CommissionQueueService) {}

  // Run every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleReconciliation() {
    this.logger.log('🔄 Running automated commission reconciliation...');
    await this.commissionQueueService.triggerManualReconciliation();
  }
}

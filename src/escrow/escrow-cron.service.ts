import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EscrowService } from './escrow.service';

@Injectable()
export class EscrowCronService {
  private readonly logger = new Logger(EscrowCronService.name);

  constructor(private readonly escrowService: EscrowService) {}

  /**
   * Process auto-release every hour
   * This will check for escrows that have passed their auto-release date
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processAutoRelease() {
    try {
      this.logger.log('🕐 [CRON] Starting auto-release processing...');
      await this.escrowService.processAutoRelease();
      this.logger.log('✅ [CRON] Auto-release processing completed');
    } catch (error) {
      this.logger.error('❌ [CRON] Auto-release processing failed:', error);
    }
  }

  /**
   * Process auto-release every 30 minutes for more frequent checks
   * This is more aggressive but ensures timely releases
   */
  @Cron('0 */30 * * * *')
  async processAutoReleaseFrequent() {
    try {
      this.logger.log('🕐 [CRON] Starting frequent auto-release processing...');
      await this.escrowService.processAutoRelease();
      this.logger.log('✅ [CRON] Frequent auto-release processing completed');
    } catch (error) {
      this.logger.error('❌ [CRON] Frequent auto-release processing failed:', error);
    }
  }
}







import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queues.constant';

@Injectable()
export class BullBoardService {
  private readonly logger = new Logger(BullBoardService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.COMMISSION_RECONCILIATION)
    private reconciliationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMMISSION_PROCESSING)
    private processingQueue: Queue,
  ) {}

  async getQueueStats() {
    const reconciliationStats = await this.reconciliationQueue.getJobCounts();
    const processingStats = await this.processingQueue.getJobCounts();

    return {
      reconciliation: {
        name: 'Commission Reconciliation',
        ...reconciliationStats,
      },
      processing: {
        name: 'Commission Processing',
        ...processingStats,
      },
    };
  }

  async getQueueHealth() {
    try {
      const reconciliationHealth = await this.reconciliationQueue.isPaused();
      const processingHealth = await this.processingQueue.isPaused();

      return {
        reconciliation: {
          name: 'Commission Reconciliation',
          isPaused: reconciliationHealth,
          status: reconciliationHealth ? 'paused' : 'running',
        },
        processing: {
          name: 'Commission Processing',
          isPaused: processingHealth,
          status: processingHealth ? 'paused' : 'running',
        },
        overall: reconciliationHealth || processingHealth ? 'degraded' : 'healthy',
      };
    } catch (error) {
      this.logger.error('Error checking queue health:', error);
      return {
        overall: 'error',
        error: error.message,
      };
    }
  }

  async pauseQueue(queueName: string) {
    try {
      const queue = queueName === QUEUE_NAMES.COMMISSION_RECONCILIATION 
        ? this.reconciliationQueue 
        : this.processingQueue;
      
      await queue.pause();
      this.logger.log(`Queue ${queueName} paused`);
      return { success: true, message: `Queue ${queueName} paused successfully` };
    } catch (error) {
      this.logger.error(`Error pausing queue ${queueName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async resumeQueue(queueName: string) {
    try {
      const queue = queueName === QUEUE_NAMES.COMMISSION_RECONCILIATION 
        ? this.reconciliationQueue 
        : this.processingQueue;
      
      await queue.resume();
      this.logger.log(`Queue ${queueName} resumed`);
      return { success: true, message: `Queue ${queueName} resumed successfully` };
    } catch (error) {
      this.logger.error(`Error resuming queue ${queueName}:`, error);
      return { success: false, error: error.message };
    }
  }

  async clearQueue(queueName: string) {
    try {
      const queue = queueName === QUEUE_NAMES.COMMISSION_RECONCILIATION 
        ? this.reconciliationQueue 
        : this.processingQueue;
      
      await queue.obliterate({ force: true });
      this.logger.log(`Queue ${queueName} cleared`);
      return { success: true, message: `Queue ${queueName} cleared successfully` };
    } catch (error) {
      this.logger.error(`Error clearing queue ${queueName}:`, error);
      return { success: false, error: error.message };
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../queue/queues.constant';

export interface PackageTrackingJobData {
  orderId: string;
  packageId: number;
  businessId: string;
  retailerId: string;
  retailerName: string;
  customerEmail: string;
  customerName: string;
  retryCount?: number;
  isDoorDelivery?: boolean; // Track if this is a doorstep package
  doorstepDestinationId?: number; // Door delivery destination ID
}

@Injectable()
export class PackageTrackingQueueService {
  private readonly logger = new Logger(PackageTrackingQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PACKAGE_TRACKING)
    private packageTrackingQueue: Queue<PackageTrackingJobData>,
  ) {}

  /**
   * Add a package tracking job to the queue
   * @param data Package tracking job data
   * @param delay Delay in milliseconds before processing (default: 30 seconds for demo)
   */
  async addPackageTrackingJob(
    data: PackageTrackingJobData,
    delay: number = 30 * 1000, // 30 seconds default delay for demo
  ): Promise<void> {
    try {
      const job = await this.packageTrackingQueue.add(
        'track-package',
        data,
        {
          delay,
          attempts: 10, // Retry up to 10 times
          backoff: {
            type: 'exponential',
            delay: 60000, // Start with 1 minute delay
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
        }
      );

      this.logger.log(
        `📦 [PACKAGE_TRACKING] Added tracking job for package ${data.packageId} (Order: ${data.orderId}) - Job ID: ${job.id}`
      );
    } catch (error) {
      this.logger.error(
        `❌ [PACKAGE_TRACKING] Failed to add tracking job for package ${data.packageId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Add multiple package tracking jobs for an order
   * @param packages Array of package data
   * @param delay Delay in milliseconds before processing
   */
  async addMultiplePackageTrackingJobs(
    packages: PackageTrackingJobData[],
    delay: number = 5 * 60 * 1000,
  ): Promise<void> {
    try {
      const jobs = packages.map((data) => ({
        name: 'track-package',
        data,
        opts: {
          delay,
          attempts: 10,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }));

      await this.packageTrackingQueue.addBulk(jobs);

      this.logger.log(
        `📦 [PACKAGE_TRACKING] Added ${packages.length} tracking jobs for order ${packages[0]?.orderId}`
      );
    } catch (error) {
      this.logger.error(
        `❌ [PACKAGE_TRACKING] Failed to add multiple tracking jobs:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.packageTrackingQueue.getWaiting();
    const active = await this.packageTrackingQueue.getActive();
    const completed = await this.packageTrackingQueue.getCompleted();
    const failed = await this.packageTrackingQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Clean old jobs from the queue
   */
  async cleanQueue(grace: number = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      await this.packageTrackingQueue.clean(grace, 'completed');
      await this.packageTrackingQueue.clean(grace, 'failed');
      
      this.logger.log(`🧹 [PACKAGE_TRACKING] Cleaned old jobs from queue`);
    } catch (error) {
      this.logger.error(`❌ [PACKAGE_TRACKING] Failed to clean queue:`, error);
    }
  }
}





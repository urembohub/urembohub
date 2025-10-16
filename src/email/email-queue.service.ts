import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../queue/queues.constant';

export interface EmailJobData {
  type: 'onboarding_submission' | 'onboarding_approval' | 'onboarding_rejection' | 'order_notification' | 'payment_notification';
  recipientEmail: string;
  recipientName?: string;
  data: any;
  priority?: number;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL_NOTIFICATIONS)
    private emailQueue: Queue<EmailJobData>
  ) {}

  /**
   * Add an email notification job to the queue
   */
  async addEmailJob(jobData: EmailJobData): Promise<void> {
    try {
      const job = await this.emailQueue.add('send-email', jobData, {
        priority: jobData.priority || 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      });

      this.logger.log(`📧 Email job queued: ${jobData.type} for ${jobData.recipientEmail} (Job ID: ${job.id})`);
    } catch (error) {
      this.logger.error(`❌ Failed to queue email job: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add onboarding submission notification job
   */
  async addOnboardingSubmissionNotification(data: {
    businessName: string;
    fullName: string;
    email: string;
    role: string;
    submittedAt: string;
  }): Promise<void> {
    await this.addEmailJob({
      type: 'onboarding_submission',
      recipientEmail: 'admin@urembohub.com',
      recipientName: 'Admin',
      data,
      priority: 1, // High priority for admin notifications
    });
  }

  /**
   * Add onboarding approval notification job
   */
  async addOnboardingApprovalNotification(data: {
    recipientEmail: string;
    recipientName: string;
    businessName: string;
  }): Promise<void> {
    await this.addEmailJob({
      type: 'onboarding_approval',
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      data,
      priority: 2,
    });
  }

  /**
   * Add onboarding rejection notification job
   */
  async addOnboardingRejectionNotification(data: {
    recipientEmail: string;
    recipientName: string;
    businessName: string;
    rejectionReason: string;
  }): Promise<void> {
    await this.addEmailJob({
      type: 'onboarding_rejection',
      recipientEmail: data.recipientEmail,
      recipientName: data.recipientName,
      data,
      priority: 2,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.emailQueue.getWaiting();
    const active = await this.emailQueue.getActive();
    const completed = await this.emailQueue.getCompleted();
    const failed = await this.emailQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}

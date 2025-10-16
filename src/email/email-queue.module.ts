import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailQueueService } from './email-queue.service';
import { EmailNotificationProcessor } from './processors/email-notification.processor';
import { EmailService } from './email.service';
import { QUEUE_NAMES } from '../queue/queues.constant';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.EMAIL_NOTIFICATIONS,
    }),
  ],
  providers: [
    EmailQueueService,
    EmailNotificationProcessor,
    EmailService,
  ],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}

import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailQueueModule } from './email-queue.module';

@Module({
  imports: [EmailQueueModule],
  providers: [EmailService],
  exports: [EmailService, EmailQueueModule],
})
export class EmailModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PackageTrackingQueueService } from './package-tracking-queue.service';
import { PackageTrackingProcessor } from './processors/package-tracking.processor';
import { QUEUE_NAMES } from '../queue/queues.constant';
import { PrismaModule } from '../prisma/prisma.module';
import { PickupMtaaniModule } from './pickup-mtaani.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.PACKAGE_TRACKING,
    }),
    PrismaModule,
    PickupMtaaniModule,
    EmailModule,
  ],
  providers: [PackageTrackingQueueService, PackageTrackingProcessor],
  exports: [PackageTrackingQueueService],
})
export class PackageTrackingQueueModule {}





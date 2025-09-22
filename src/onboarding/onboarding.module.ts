import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingHistoryService } from './onboarding-history.service';
import { OnboardingHistoryController } from './onboarding-history.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [PrismaModule, EmailModule, AdminModule],
  controllers: [OnboardingController, OnboardingHistoryController],
  providers: [OnboardingService, OnboardingHistoryService],
  exports: [OnboardingService, OnboardingHistoryService],
})
export class OnboardingModule {}

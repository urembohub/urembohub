import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';
import { CommissionController } from './commission.controller';
import { EnhancedCommissionService } from './enhanced-commission.service';
import { EnhancedCommissionController } from './enhanced-commission.controller';
import { CommissionAnalyticsService } from './commission-analytics.service';

@Module({
  controllers: [CommissionController, EnhancedCommissionController],
  providers: [CommissionService, EnhancedCommissionService, CommissionAnalyticsService],
  exports: [CommissionService, EnhancedCommissionService, CommissionAnalyticsService],
})
export class CommissionModule {}

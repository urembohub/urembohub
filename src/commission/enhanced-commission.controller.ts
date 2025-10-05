import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { EnhancedCommissionService } from './enhanced-commission.service';
import { CommissionAnalyticsService } from './commission-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { 
  ProcessCommissionDto, 
  CommissionPayoutDto, 
  CommissionStatsDto, 
  CommissionReportDto,
  CreateCommissionSettingDto,
  UpdateCommissionSettingDto
} from './dto/commission.dto';
import { user_role } from '@prisma/client';

@Controller('commission')
export class EnhancedCommissionController {
  constructor(
    private enhancedCommissionService: EnhancedCommissionService,
    private analyticsService: CommissionAnalyticsService
  ) {}

  // Calculate commission for a transaction
  @Post('calculate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async calculateCommission(
    @Body() body: { transactionAmount: number; role: user_role; businessUserId?: string },
    @Request() req
  ) {
    return this.enhancedCommissionService.calculateCommission(
      body.transactionAmount,
      body.role,
      body.businessUserId
    );
  }

  // Process commission transaction
  @Post('process')
  @UseGuards(JwtAuthGuard)
  async processCommission(
    @Body() dto: ProcessCommissionDto,
    @Request() req
  ) {
    return this.enhancedCommissionService.processCommission(dto);
  }

  // Get user commission stats
  @Get('stats/user/:userId')
  @UseGuards(JwtAuthGuard)
  async getUserCommissionStats(
    @Param('userId') userId: string,
    @Query() query: CommissionStatsDto,
    @Request() req
  ) {
    return this.enhancedCommissionService.getUserCommissionStats(userId, query);
  }

  // Get current user's commission stats
  @Get('stats/my')
  @UseGuards(JwtAuthGuard)
  async getMyCommissionStats(
    @Query() query: CommissionStatsDto,
    @Request() req
  ) {
    return this.enhancedCommissionService.getUserCommissionStats(req.user.sub, query);
  }

  // Generate commission report
  @Post('reports/generate')
  @UseGuards(JwtAuthGuard)
  async generateCommissionReport(
    @Body() dto: CommissionReportDto,
    @Request() req
  ) {
    return this.enhancedCommissionService.generateCommissionReport(dto);
  }

  // Process commission payout
  @Post('payouts/process')
  @UseGuards(JwtAuthGuard)
  async processCommissionPayout(
    @Body() dto: CommissionPayoutDto,
    @Request() req
  ) {
    return this.enhancedCommissionService.processCommissionPayout(dto);
  }

  // Auto-process commissions for completed order
  @Post('auto-process/order/:orderId')
  @UseGuards(JwtAuthGuard)
  async autoProcessCommissionsForOrder(
    @Param('orderId') orderId: string,
    @Request() req
  ) {
    await this.enhancedCommissionService.autoProcessCommissionsForOrder(orderId);
    return { success: true, message: 'Commissions processed successfully' };
  }

  // Get commission analytics for admin dashboard
  @Get('analytics/dashboard')
  @UseGuards(JwtAuthGuard)
  async getCommissionAnalytics(@Request() req) {
    return this.analyticsService.getCommissionDashboardAnalytics();
  }

  // Get commission trends over time
  @Get('analytics/trends')
  @UseGuards(JwtAuthGuard)
  async getCommissionTrends(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days: string = '30',
    @Request() req
  ) {
    const daysNumber = parseInt(days, 10) || 30;
    
    // This would integrate with your time series analytics
    // For now, return placeholder data
    return {
      period,
      days: daysNumber,
      data: []
    };
  }

  // Bulk process commissions for multiple orders
  @Post('bulk-process')
  @UseGuards(JwtAuthGuard)
  async bulkProcessCommissions(
    @Body() body: { orderIds: string[] },
    @Request() req
  ) {
    const results = [];
    
    for (const orderId of body.orderIds) {
      try {
        await this.enhancedCommissionService.autoProcessCommissionsForOrder(orderId);
        results.push({ orderId, status: 'success' });
      } catch (error) {
        results.push({ orderId, status: 'error', error: error.message });
      }
    }

    return {
      success: true,
      results,
      summary: {
        total: body.orderIds.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }
    };
  }

  // Get commission settings (enhanced version)
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getCommissionSettings(@Request() req) {
    // This would use the existing commission service
    // For now, return basic settings
    return {
      vendor: { rate: 10, isActive: true },
      retailer: { rate: 8, isActive: true },
      manufacturer: { rate: 5, isActive: true }
    };
  }

  // Update commission settings (enhanced version)
  @Put('settings/:role')
  @UseGuards(JwtAuthGuard)
  async updateCommissionSettings(
    @Param('role') role: user_role,
    @Body() dto: UpdateCommissionSettingDto,
    @Request() req
  ) {
    // This would use the existing commission service
    return {
      success: true,
      message: `Commission settings updated for ${role}`,
      data: {
        role,
        commissionRate: dto.commissionRate,
        isActive: dto.isActive
      }
    };
  }
}

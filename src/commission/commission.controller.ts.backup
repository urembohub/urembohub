import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { CommissionService } from './commission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('commission')
export class CommissionController {
  constructor(private commissionService: CommissionService) {}

  // Get all commission settings
  @Get('settings')
  async getCommissionSettings() {
    return this.commissionService.getCommissionSettings();
  }

  // Get commission setting by role
  @Get('settings/:role')
  async getCommissionSettingByRole(@Param('role') role: string) {
    return this.commissionService.getCommissionSettingByRole(role);
  }

  // Update commission setting (admin only)
  @Put('settings/:role')
  @UseGuards(JwtAuthGuard)
  async updateCommissionSetting(
    @Param('role') role: string,
    @Body() body: { commissionRate: number; isActive?: boolean },
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.commissionService.updateCommissionSetting(role, body.commissionRate, body.isActive);
  }

  // Get commission transactions
  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getCommissionTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.commissionService.getCommissionTransactions(
      pageNum,
      limitNum,
      role,
      status,
      dateFrom,
      dateTo
    );
  }

  // Create commission transaction
  @Post('transactions')
  @UseGuards(JwtAuthGuard)
  async createCommissionTransaction(
    @Body() data: {
      businessUserId: string;
      businessRole: string;
      transactionType: string;
      transactionId: string;
      transactionAmount: number;
      commissionAmount: number;
      commissionRate: number;
      paymentStatus: string;
      paymentMethodId?: string;
      stripePaymentIntentId?: string;
      metadata?: any;
    },
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.commissionService.createCommissionTransaction(data);
  }

  // Update commission transaction status
  @Put('transactions/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateCommissionTransactionStatus(
    @Param('id') id: string,
    @Body() body: { paymentStatus: string },
    @Request() req
  ) {
    // TODO: Add admin role check
    return this.commissionService.updateCommissionTransactionStatus(id, body.paymentStatus);
  }

  // Get commission statistics
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard)
  async getCommissionStats(
    @Query('role') role?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.commissionService.getCommissionStats(role, dateFrom, dateTo);
  }

  // Get user's commission transactions
  @Get('my/transactions')
  @UseGuards(JwtAuthGuard)
  async getUserCommissionTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.commissionService.getUserCommissionTransactions(req.user.sub, pageNum, limitNum);
  }

  // Get user's commission statistics
  @Get('my/stats')
  @UseGuards(JwtAuthGuard)
  async getUserCommissionStats(@Request() req) {
    return this.commissionService.getUserCommissionStats(req.user.sub);
  }

  // Calculate commission for a transaction
  @Post('calculate')
  @UseGuards(JwtAuthGuard)
  async calculateCommission(
    @Body() body: { transactionAmount: number; role: string },
    @Request() req
  ) {
    return this.commissionService.calculateCommission(body.transactionAmount, body.role);
  }
}

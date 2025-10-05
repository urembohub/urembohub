import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ✅ NEW: Optimized executive summary for main dashboard
  @Get('dashboard/executive-summary')
  @UseGuards(JwtAuthGuard)
  async getExecutiveSummary(@Request() req) {
    return this.analyticsService.getExecutiveSummary();
  }

  // Get comprehensive dashboard analytics
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboardAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    return this.analyticsService.getDashboardAnalytics(req.user.sub, req.user.role, dateRange);
  }

  // ✅ NEW: Lightweight analytics for retailer dashboard (faster)
  @Get('dashboard/light')
  @UseGuards(JwtAuthGuard)
  async getLightDashboardAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    return this.analyticsService.getLightDashboardAnalytics(req.user.sub, req.user.role, dateRange);
  }

  // ✅ NEW: Unified retailer dashboard endpoint
  @Get('retailer/dashboard')
  @UseGuards(JwtAuthGuard)
  async getRetailerDashboard(@Request() req) {
    return this.analyticsService.getRetailerDashboard(req.user.sub);
  }

  // Get order analytics
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrderAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getOrderAnalytics(whereClause);
  }

  // Get revenue analytics
  @Get('revenue')
  @UseGuards(JwtAuthGuard)
  async getRevenueAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getRevenueAnalytics(whereClause);
  }

  // Get product analytics
  @Get('products')
  @UseGuards(JwtAuthGuard)
  async getProductAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getProductAnalytics(whereClause);
  }

  // Get service analytics
  @Get('services')
  @UseGuards(JwtAuthGuard)
  async getServiceAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getServiceAnalytics(whereClause);
  }

  // Get user analytics
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async getUserAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getUserAnalytics(whereClause);
  }

  // Get payment analytics
  @Get('payments')
  @UseGuards(JwtAuthGuard)
  async getPaymentAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getPaymentAnalytics(whereClause);
  }

  // Get ticket analytics
  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  async getTicketAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getTicketAnalytics(whereClause);
  }

  // Get review analytics
  @Get('reviews')
  @UseGuards(JwtAuthGuard)
  async getReviewAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getReviewAnalytics(whereClause);
  }

  // Get live shopping analytics
  @Get('live-shopping')
  @UseGuards(JwtAuthGuard)
  async getLiveShoppingAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getLiveShoppingAnalytics(whereClause);
  }

  // Get manufacturer order analytics
  @Get('manufacturer-orders')
  @UseGuards(JwtAuthGuard)
  async getManufacturerOrderAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getManufacturerOrderAnalytics(whereClause);
  }

  // Get onboarding analytics
  @Get('onboarding')
  @UseGuards(JwtAuthGuard)
  async getOnboardingAnalytics(
    @Request() req,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const whereClause = this.analyticsService.buildWhereClause(req.user.sub, req.user.role, dateRange);
    return this.analyticsService.getOnboardingAnalytics(whereClause);
  }

  // ✅ NEW: Time Series Analytics Endpoints
  @Get('time-series/revenue')
  @UseGuards(JwtAuthGuard)
  async getRevenueTimeSeries(
    @Request() req,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days: string = '30',
  ) {
    const daysNumber = parseInt(days, 10) || 30;
    return this.analyticsService.getRevenueTimeSeries(period, daysNumber);
  }

  @Get('time-series/orders')
  @UseGuards(JwtAuthGuard)
  async getOrderVolumeTimeSeries(
    @Request() req,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days: string = '30',
  ) {
    const daysNumber = parseInt(days, 10) || 30;
    return this.analyticsService.getOrderVolumeTimeSeries(period, daysNumber);
  }

  @Get('time-series/users')
  @UseGuards(JwtAuthGuard)
  async getUserGrowthTimeSeries(
    @Request() req,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Query('days') days: string = '30',
  ) {
    const daysNumber = parseInt(days, 10) || 30;
    return this.analyticsService.getUserGrowthTimeSeries(period, daysNumber);
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { user_role } from '@prisma/client';

@Injectable()
export class CommissionAnalyticsService {
  private readonly logger = new Logger(CommissionAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // Get comprehensive commission analytics for dashboard
  async getCommissionDashboardAnalytics() {
    try {
      this.logger.log('📊 Fetching commission dashboard analytics...');

      // Get current month data
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Get last month data
      const lastMonth = new Date(currentMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Get commission transactions for current month
      const currentMonthCommissions = await this.prisma.commissionTransaction.findMany({
        where: {
          createdAt: { gte: currentMonth }
        }
      });

      // Get commission transactions for last month
      const lastMonthCommissions = await this.prisma.commissionTransaction.findMany({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: currentMonth
          }
        }
      });

      // Calculate totals
      const totalCommissionPaid = currentMonthCommissions
        .filter(c => c.paymentStatus === 'completed')
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      const totalCommissionPending = currentMonthCommissions
        .filter(c => c.paymentStatus === 'pending')
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      const lastMonthTotal = lastMonthCommissions
        .filter(c => c.paymentStatus === 'completed')
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      // Calculate growth
      const commissionGrowth = lastMonthTotal > 0 
        ? ((totalCommissionPaid - lastMonthTotal) / lastMonthTotal) * 100 
        : 0;

      // Get commission by role (only completed transactions for consistency)
      const commissionByRole = {
        vendor: 0,
        retailer: 0,
        manufacturer: 0
      };

      currentMonthCommissions
        .filter(c => c.paymentStatus === 'completed')
        .forEach(commission => {
          const role = commission.businessRole;
          if (role in commissionByRole) {
            commissionByRole[role] += Number(commission.commissionAmount);
          }
        });

      // Get top earners
      const topEarners = await this.getTopCommissionEarners(10);

      // Get commission trends (last 30 days)
      const commissionTrends = await this.getCommissionTrends('daily', 30);

      return {
        summary: {
          totalCommissionPaid,
          totalCommissionPending,
          monthlyCommission: totalCommissionPaid,
          commissionGrowth,
          transactionCount: currentMonthCommissions.length
        },
        byRole: commissionByRole,
        topEarners,
        trends: commissionTrends
      };
    } catch (error) {
      this.logger.error(`Error fetching commission analytics: ${error.message}`);
      throw error;
    }
  }

  // Get commission trends over time
  async getCommissionTrends(period: 'daily' | 'weekly' | 'monthly', days: number) {
    try {
      this.logger.log(`📈 Fetching commission trends for ${period} over ${days} days`);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const commissions = await this.prisma.commissionTransaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          paymentStatus: 'completed'
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by period
      const groupedData: Record<string, number> = {};
      
      commissions.forEach(commission => {
        const date = new Date(commission.createdAt);
        let periodKey: string;

        switch (period) {
          case 'daily':
            periodKey = date.toISOString().split('T')[0];
            break;
          case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
        }

        if (!groupedData[periodKey]) {
          groupedData[periodKey] = 0;
        }
        groupedData[periodKey] += Number(commission.commissionAmount);
      });

      // Generate complete date range
      const completeData = this.generateCompleteDateRange(startDate, endDate, period, groupedData);

      return {
        period,
        days,
        data: completeData
      };
    } catch (error) {
      this.logger.error(`Error fetching commission trends: ${error.message}`);
      throw error;
    }
  }

  // Get top commission earners
  async getTopCommissionEarners(limit: number = 10) {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const topEarners = await this.prisma.commissionTransaction.groupBy({
        by: ['businessUserId', 'businessRole'],
        where: {
          createdAt: { gte: currentMonth },
          paymentStatus: 'completed'
        },
        _sum: {
          commissionAmount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            commissionAmount: 'desc'
          }
        },
        take: limit
      });

      // Get user details
      const userIds = topEarners.map(earner => earner.businessUserId);
      const users = await this.prisma.profile.findMany({
        where: {
          id: { in: userIds }
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      });

      const userMap = new Map(users.map(user => [user.id, user]));

      return topEarners.map(earner => ({
        userId: earner.businessUserId,
        user: userMap.get(earner.businessUserId),
        role: earner.businessRole,
        totalCommission: Number(earner._sum.commissionAmount),
        transactionCount: earner._count.id
      }));
    } catch (error) {
      this.logger.error(`Error fetching top earners: ${error.message}`);
      throw error;
    }
  }

  // Get commission performance by role
  async getCommissionPerformanceByRole() {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const performance = await this.prisma.commissionTransaction.groupBy({
        by: ['businessRole'],
        where: {
          createdAt: { gte: currentMonth }
        },
        _sum: {
          commissionAmount: true,
          transactionAmount: true
        },
        _count: {
          id: true
        }
      });

      return performance.map(role => ({
        role: role.businessRole,
        totalCommission: Number(role._sum.commissionAmount),
        totalTransactionAmount: Number(role._sum.transactionAmount),
        transactionCount: role._count.id,
        averageCommission: role._count.id > 0 
          ? Number(role._sum.commissionAmount) / role._count.id 
          : 0
      }));
    } catch (error) {
      this.logger.error(`Error fetching commission performance: ${error.message}`);
      throw error;
    }
  }

  // Generate complete date range for trends
  private generateCompleteDateRange(
    startDate: Date, 
    endDate: Date, 
    period: string, 
    data: Record<string, number>
  ) {
    const result = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      let periodKey: string;

      switch (period) {
        case 'daily':
          periodKey = current.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(current);
          weekStart.setDate(current.getDate() - current.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      result.push({
        period: periodKey,
        amount: data[periodKey] || 0
      });

      // Increment based on period
      switch (period) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return result;
  }
}

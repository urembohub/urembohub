import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  CommissionCalculation, 
  CommissionStats, 
  CommissionReport, 
  CommissionPayout,
  CommissionTier,
  CommissionDispute 
} from './interfaces/commission.interface';
import { ProcessCommissionDto, CommissionPayoutDto, CommissionStatsDto, CommissionReportDto } from './dto/commission.dto';
import { user_role } from '@prisma/client';

@Injectable()
export class EnhancedCommissionService {
  private readonly logger = new Logger(EnhancedCommissionService.name);

  constructor(private prisma: PrismaService) {}

  // Enhanced commission calculation with tiers and platform fees
  async calculateCommission(
    transactionAmount: number, 
    role: user_role,
    businessUserId?: string
  ): Promise<CommissionCalculation> {
    try {
      this.logger.log(`Calculating commission for role: ${role}, amount: ${transactionAmount}`);

      // Get commission setting for the role
      const setting = await this.prisma.commissionSettings.findFirst({
        where: { 
          role,
          isActive: true 
        },
      });

      if (!setting) {
        this.logger.warn(`No active commission setting found for role: ${role}`);
        return {
          commissionRate: 0,
          commissionAmount: 0,
          netAmount: transactionAmount,
          platformFee: 0
        };
      }

      // Check for tiered commission structure (if implemented)
      const tieredRate = await this.getTieredCommissionRate(role, transactionAmount, businessUserId);
      const commissionRate = tieredRate || Number(setting.commissionRate);

      // Calculate commission amount
      const commissionAmount = (transactionAmount * commissionRate) / 100;
      
      // Platform fee (fixed percentage for platform operations)
      const platformFeeRate = 0.02; // 2% platform fee
      const platformFee = transactionAmount * platformFeeRate;
      
      // Net amount after commission and platform fee
      const netAmount = transactionAmount - commissionAmount - platformFee;

      this.logger.log(`Commission calculated: ${commissionAmount}, Platform fee: ${platformFee}, Net: ${netAmount}`);

      return {
        commissionRate,
        commissionAmount,
        netAmount,
        platformFee
      };
    } catch (error) {
      this.logger.error(`Error calculating commission: ${error.message}`);
      throw new BadRequestException('Failed to calculate commission');
    }
  }

  // Process commission transaction
  async processCommission(dto: ProcessCommissionDto): Promise<any> {
    try {
      this.logger.log(`Processing commission for transaction: ${dto.transactionId}`);

      // Calculate commission
      const calculation = await this.calculateCommission(
        dto.transactionAmount,
        dto.businessRole,
        dto.businessUserId
      );

      // Create commission transaction record
      const commissionTransaction = await this.prisma.commissionTransaction.create({
        data: {
          businessUserId: dto.businessUserId,
          businessRole: dto.businessRole,
          transactionType: dto.transactionType,
          transactionId: dto.transactionId,
          transactionAmount: dto.transactionAmount,
          commissionRate: calculation.commissionRate,
          commissionAmount: calculation.commissionAmount,
          paymentStatus: 'pending',
          metadata: dto.metadata || {}
        }
      });

      this.logger.log(`Commission transaction created: ${commissionTransaction.id}`);

      return {
        success: true,
        commissionTransaction,
        calculation
      };
    } catch (error) {
      this.logger.error(`Error processing commission: ${error.message}`);
      throw new BadRequestException('Failed to process commission');
    }
  }

  // Get comprehensive commission stats for a user
  async getUserCommissionStats(userId: string, dto?: CommissionStatsDto): Promise<CommissionStats> {
    try {
      const whereClause: any = {
        businessUserId: userId
      };

      if (dto?.startDate && dto?.endDate) {
        whereClause.createdAt = {
          gte: new Date(dto.startDate),
          lte: new Date(dto.endDate)
        };
      }

      // Get all commission transactions for the user
      const transactions = await this.prisma.commissionTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });

      // Calculate stats
      const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
      const pendingAmount = transactions
        .filter(t => t.paymentStatus === 'pending')
        .reduce((sum, t) => sum + Number(t.commissionAmount), 0);
      const paidAmount = transactions
        .filter(t => t.paymentStatus === 'completed')
        .reduce((sum, t) => sum + Number(t.commissionAmount), 0);

      // Monthly and yearly calculations
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const monthlyEarnings = transactions
        .filter(t => t.createdAt >= monthStart)
        .reduce((sum, t) => sum + Number(t.commissionAmount), 0);

      const yearlyEarnings = transactions
        .filter(t => t.createdAt >= yearStart)
        .reduce((sum, t) => sum + Number(t.commissionAmount), 0);

      return {
        totalEarnings: totalCommission,
        totalCommission,
        pendingAmount,
        paidAmount,
        transactionCount: transactions.length,
        averageCommission: transactions.length > 0 ? totalCommission / transactions.length : 0,
        monthlyEarnings,
        yearlyEarnings
      };
    } catch (error) {
      this.logger.error(`Error getting user commission stats: ${error.message}`);
      throw new BadRequestException('Failed to get commission stats');
    }
  }

  // Generate commission report
  async generateCommissionReport(dto: CommissionReportDto): Promise<CommissionReport> {
    try {
      this.logger.log(`Generating commission report from ${dto.startDate} to ${dto.endDate}`);

      const whereClause: any = {
        createdAt: {
          gte: new Date(dto.startDate),
          lte: new Date(dto.endDate)
        }
      };

      if (dto.role) {
        whereClause.businessRole = dto.role;
      }

      const transactions = await this.prisma.commissionTransaction.findMany({
        where: whereClause,
        include: {
          businessUser: {
            select: {
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Calculate summary
      const totalTransactions = transactions.length;
      const totalCommission = transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);
      const totalEarnings = transactions.reduce((sum, t) => sum + Number(t.transactionAmount), 0);
      const averageCommissionRate = transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + Number(t.commissionRate), 0) / transactions.length 
        : 0;

      // Group by role
      const byRole: Record<string, any> = {};
      transactions.forEach(transaction => {
        const role = transaction.businessRole;
        if (!byRole[role]) {
          byRole[role] = {
            transactionCount: 0,
            totalCommission: 0,
            averageCommission: 0
          };
        }
        byRole[role].transactionCount++;
        byRole[role].totalCommission += Number(transaction.commissionAmount);
      });

      // Calculate averages for each role
      Object.keys(byRole).forEach(role => {
        const roleData = byRole[role];
        roleData.averageCommission = roleData.totalCommission / roleData.transactionCount;
      });

      return {
        period: {
          startDate: dto.startDate,
          endDate: dto.endDate
        },
        summary: {
          totalTransactions,
          totalCommission,
          totalEarnings,
          averageCommissionRate
        },
        byRole,
        transactions: transactions.map(t => ({
          id: t.id,
          date: t.createdAt.toISOString(),
          businessUser: t.businessUser.fullName || t.businessUser.email,
          role: t.businessRole,
          transactionType: t.transactionType,
          transactionAmount: Number(t.transactionAmount),
          commissionRate: Number(t.commissionRate),
          commissionAmount: Number(t.commissionAmount),
          status: t.paymentStatus
        }))
      };
    } catch (error) {
      this.logger.error(`Error generating commission report: ${error.message}`);
      throw new BadRequestException('Failed to generate commission report');
    }
  }

  // Process commission payout
  async processCommissionPayout(dto: CommissionPayoutDto): Promise<CommissionPayout> {
    try {
      this.logger.log(`Processing commission payout for user: ${dto.businessUserId}, amount: ${dto.amount}`);

      // Get pending commission transactions
      const pendingTransactions = await this.prisma.commissionTransaction.findMany({
        where: {
          businessUserId: dto.businessUserId,
          paymentStatus: 'pending'
        },
        orderBy: { createdAt: 'asc' }
      });

      const totalPending = pendingTransactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0);

      if (dto.amount > totalPending) {
        throw new BadRequestException('Payout amount exceeds pending commission');
      }

      // Create payout record (you might want to add a CommissionPayout model)
      const payout = {
        id: `payout_${Date.now()}`,
        businessUserId: dto.businessUserId,
        amount: dto.amount,
        status: 'processing' as const,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
        createdAt: new Date()
      };

      // Update commission transactions to paid
      const transactionIds = pendingTransactions.map(t => t.id);
      await this.prisma.commissionTransaction.updateMany({
        where: {
          id: { in: transactionIds }
        },
        data: {
          paymentStatus: 'completed',
          processedAt: new Date()
        }
      });

      this.logger.log(`Commission payout processed: ${payout.id}`);

      return payout;
    } catch (error) {
      this.logger.error(`Error processing commission payout: ${error.message}`);
      throw new BadRequestException('Failed to process commission payout');
    }
  }

  // Get tiered commission rate (for future implementation)
  private async getTieredCommissionRate(
    role: user_role, 
    amount: number, 
    businessUserId?: string
  ): Promise<number | null> {
    // This is a placeholder for tiered commission logic
    // You can implement volume-based or performance-based commission tiers here
    return null;
  }

  // Auto-process commissions for completed orders
  async autoProcessCommissionsForOrder(orderId: string): Promise<void> {
    try {
      this.logger.log(`Auto-processing commissions for order: ${orderId}`);

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  retailer: true
                }
              }
            }
          },
          serviceAppointments: {
            include: {
              vendor: true
            }
          }
        }
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Process commissions for product orders (retailers)
      for (const item of order.orderItems) {
        if (item.product.retailer) {
          await this.processCommission({
            businessUserId: item.product.retailer.id,
            businessRole: 'retailer',
            transactionType: 'product_purchase',
            transactionId: orderId,
            transactionAmount: Number(item.totalPrice),
            metadata: {
              orderId,
              productId: item.product.id,
              itemId: item.id
            }
          });
        }
      }

      // Process commissions for service orders (vendors)
      for (const appointment of order.serviceAppointments) {
        await this.processCommission({
          businessUserId: appointment.vendor.id,
          businessRole: 'vendor',
          transactionType: 'service_booking',
          transactionId: orderId,
          transactionAmount: Number(appointment.servicePrice),
          metadata: {
            orderId,
            serviceId: appointment.serviceId,
            appointmentId: appointment.id
          }
        });
      }

      this.logger.log(`Auto-processed commissions for order: ${orderId}`);
    } catch (error) {
      this.logger.error(`Error auto-processing commissions for order ${orderId}: ${error.message}`);
      throw error;
    }
  }
}

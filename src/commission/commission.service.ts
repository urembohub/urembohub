import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionService {
  constructor(private prisma: PrismaService) {}

  // Get all commission settings
  async getCommissionSettings() {
    return this.prisma.commissionSettings.findMany({
      orderBy: { role: 'asc' },
    });
  }

  // Get commission setting by role
  async getCommissionSettingByRole(role: string) {
    const setting = await this.prisma.commissionSettings.findFirst({
      where: { role: role as any },
    });

    if (!setting) {
      throw new NotFoundException(`Commission setting for role ${role} not found`);
    }

    return setting;
  }

  // Update commission setting
  async updateCommissionSetting(role: string, commissionRate: number, isActive: boolean = true) {
    const setting = await this.prisma.commissionSettings.findFirst({
      where: { role: role as any },
    });

    if (!setting) {
      // Create new setting if it doesn't exist
      return this.prisma.commissionSettings.create({
        data: {
          role: role as any,
          commissionRate,
          isActive,
        },
      });
    }

    return this.prisma.commissionSettings.update({
      where: { id: setting.id },
      data: {
        commissionRate,
        isActive,
      },
    });
  }

  // Get commission transactions
  async getCommissionTransactions(
    page: number = 1,
    limit: number = 10,
    role?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (role) where.businessRole = role;
    if (status) where.paymentStatus = status;
    if (dateFrom) where.createdAt = { gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

    const [transactions, total] = await Promise.all([
      this.prisma.commissionTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          businessUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              businessName: true,
            },
          },
        },
      }),
      this.prisma.commissionTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Create commission transaction
  async createCommissionTransaction(data: {
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
  }) {
    return this.prisma.commissionTransaction.create({
      data: {
        businessUserId: data.businessUserId,
        businessRole: data.businessRole as any,
        transactionType: data.transactionType,
        transactionId: data.transactionId,
        transactionAmount: data.transactionAmount,
        commissionAmount: data.commissionAmount,
        commissionRate: data.commissionRate,
        paymentStatus: data.paymentStatus as any,
        paymentMethodId: data.paymentMethodId,
        stripePaymentIntentId: data.stripePaymentIntentId,
        metadata: data.metadata,
      },
      include: {
        businessUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            businessName: true,
          },
        },
      },
    });
  }

  // Update commission transaction status
  async updateCommissionTransactionStatus(id: string, paymentStatus: string) {
    const transaction = await this.prisma.commissionTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Commission transaction not found');
    }

    return this.prisma.commissionTransaction.update({
      where: { id },
      data: { 
        paymentStatus: paymentStatus as any,
        processedAt: paymentStatus === 'paid' ? new Date() : null,
      },
      include: {
        businessUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            businessName: true,
          },
        },
      },
    });
  }

  // Get commission statistics
  async getCommissionStats(role?: string, dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (role) where.businessRole = role;
    if (dateFrom) where.createdAt = { gte: new Date(dateFrom) };
    if (dateTo) where.createdAt = { ...where.createdAt, lte: new Date(dateTo) };

    const [
      totalTransactions,
      totalCommissionAmount,
      paidTransactions,
      pendingTransactions,
      paidCommissionAmount,
      pendingCommissionAmount,
    ] = await Promise.all([
      this.prisma.commissionTransaction.count({ where }),
      this.prisma.commissionTransaction.aggregate({
        where,
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionTransaction.count({
        where: { ...where, paymentStatus: 'paid' },
      }),
      this.prisma.commissionTransaction.count({
        where: { ...where, paymentStatus: 'pending' },
      }),
      this.prisma.commissionTransaction.aggregate({
        where: { ...where, paymentStatus: 'paid' },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionTransaction.aggregate({
        where: { ...where, paymentStatus: 'pending' },
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      totalTransactions,
      totalCommissionAmount: Number(totalCommissionAmount._sum.commissionAmount || 0),
      paidTransactions,
      pendingTransactions,
      paidCommissionAmount: Number(paidCommissionAmount._sum.commissionAmount || 0),
      pendingCommissionAmount: Number(pendingCommissionAmount._sum.commissionAmount || 0),
    };
  }

  // Get user's commission transactions
  async getUserCommissionTransactions(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.commissionTransaction.findMany({
        where: { businessUserId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionTransaction.count({ where: { businessUserId: userId } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get user's commission statistics
  async getUserCommissionStats(userId: string) {
    const [
      totalTransactions,
      totalCommissionAmount,
      paidCommissionAmount,
      pendingCommissionAmount,
    ] = await Promise.all([
      this.prisma.commissionTransaction.count({ where: { businessUserId: userId } }),
      this.prisma.commissionTransaction.aggregate({
        where: { businessUserId: userId },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionTransaction.aggregate({
        where: { businessUserId: userId, paymentStatus: 'completed' as any },
        _sum: { commissionAmount: true },
      }),
      this.prisma.commissionTransaction.aggregate({
        where: { businessUserId: userId, paymentStatus: 'pending' },
        _sum: { commissionAmount: true },
      }),
    ]);

    return {
      totalTransactions,
      totalCommissionAmount: Number(totalCommissionAmount._sum.commissionAmount || 0),
      paidCommissionAmount: Number(paidCommissionAmount._sum.commissionAmount || 0),
      pendingCommissionAmount: Number(pendingCommissionAmount._sum.commissionAmount || 0),
    };
  }

  // Calculate commission for a transaction
  async calculateCommission(transactionAmount: number, role: string): Promise<{
    commissionRate: number;
    commissionAmount: number;
  }> {
    const setting = await this.getCommissionSettingByRole(role);
    
    if (!setting.isActive) {
      return { commissionRate: 0, commissionAmount: 0 };
    }

    const commissionAmount = (transactionAmount * Number(setting.commissionRate)) / 100;
    
    return {
      commissionRate: Number(setting.commissionRate),
      commissionAmount,
    };
  }

  /**
   * Mark commission as processing
   */
  async markCommissionAsProcessing(
    reference: string,
    chargeData: {
      chargedAt: Date;
      transactionId: string;
      amount: number;
    }
  ) {
    // Find commissions by transaction ID (which should be the order ID)
    const commissions = await this.prisma.commissionTransaction.findMany({
      where: {
        transactionId: reference,
        paymentStatus: 'pending',
      },
    });

    for (const commission of commissions) {
      await this.prisma.commissionTransaction.update({
        where: { id: commission.id },
        data: {
          paymentStatus: 'processing',
        metadata: {
          ...(commission.metadata as any || {}),
          chargedAt: chargeData.chargedAt.toISOString(),
          transactionId: chargeData.transactionId,
        },
        },
      });
    }

    return commissions;
  }

  /**
   * Mark commission as completed
   */
  async markCommissionAsCompleted(
    settlementId: string,
    settlementData: {
      settlementId: string;
      settledAt: Date;
      subaccounts: any[];
    }
  ) {
    // Find commissions that are part of this settlement
    // Match by subaccount IDs in settlement data
    for (const subaccountSettlement of settlementData.subaccounts) {
      const commissions = await this.prisma.commissionTransaction.findMany({
        where: {
          paymentStatus: 'processing',
          // We'll need to match by business user's subaccount ID
          businessUser: {
            paystackSubaccountId: subaccountSettlement.subaccount,
          },
        },
      });

      for (const commission of commissions) {
        await this.prisma.commissionTransaction.update({
          where: { id: commission.id },
          data: {
            paymentStatus: 'completed',
            processedAt: settlementData.settledAt,
          metadata: {
            ...(commission.metadata as any || {}),
            settlementId: settlementData.settlementId,
            settledAmount: subaccountSettlement.amount / 100,
          },
          },
        });
      }
    }
  }

  /**
   * Mark commission as failed
   */
  async markCommissionAsFailed(settlementId: string, failureData: any) {
    // Find commissions with this settlement reference in metadata
    const commissions = await this.prisma.commissionTransaction.findMany({
      where: {
        paymentStatus: 'processing',
        metadata: {
          path: ['settlementId'],
          equals: settlementId,
        },
      },
    });

    for (const commission of commissions) {
      await this.prisma.commissionTransaction.update({
        where: { id: commission.id },
        data: {
          paymentStatus: 'failed',
        metadata: {
          ...(commission.metadata as any || {}),
          failureReason: failureData.failureReason,
          failedAt: failureData.failedAt,
        },
        },
      });
    }
  }
}

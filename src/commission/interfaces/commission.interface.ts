import { user_role } from '@prisma/client';

export interface CommissionCalculation {
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
}

export interface CommissionStats {
  totalEarnings: number;
  totalCommission: number;
  pendingAmount: number;
  paidAmount: number;
  transactionCount: number;
  averageCommission: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
}

export interface CommissionReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalTransactions: number;
    totalCommission: number;
    totalEarnings: number;
    averageCommissionRate: number;
  };
  byRole: Record<string, {
    transactionCount: number;
    totalCommission: number;
    averageCommission: number;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    businessUser: string;
    role: user_role;
    transactionType: string;
    transactionAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: string;
  }>;
}

export interface CommissionPayout {
  id: string;
  businessUserId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  processedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface CommissionTier {
  id: string;
  role: user_role;
  minAmount: number;
  maxAmount?: number;
  commissionRate: number;
  isActive: boolean;
}

export interface CommissionDispute {
  id: string;
  commissionTransactionId: string;
  businessUserId: string;
  reason: string;
  status: 'pending' | 'under_review' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

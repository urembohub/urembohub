import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { onboarding_status } from '@prisma/client';

export interface CreateHistoryEntryData {
  userId: string;
  adminId?: string;
  action: 'submission' | 'status_change' | 'approval' | 'rejection' | 'revision_requested';
  details?: any;
  oldStatus?: onboarding_status;
  newStatus?: onboarding_status;
  reason?: string;
  metadata?: any;
}

@Injectable()
export class OnboardingHistoryService {
  constructor(private prisma: PrismaService) {}

  async createHistoryEntry(data: CreateHistoryEntryData) {
    return this.prisma.onboardingHistory.create({
      data: {
        userId: data.userId,
        adminId: data.adminId,
        action: data.action,
        details: data.details,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        reason: data.reason,
        metadata: data.metadata,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async getUserHistory(userId: string) {
    return this.prisma.onboardingHistory.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminHistory(adminId: string) {
    return this.prisma.onboardingHistory.findMany({
      where: { adminId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllHistory() {
    return this.prisma.onboardingHistory.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        admin: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Helper methods for specific actions
  async logSubmission(userId: string, requirementId: string, fieldType: string, hasFile: boolean, submittedValue?: string) {
    return this.createHistoryEntry({
      userId,
      action: 'submission',
      details: {
        requirementId,
        fieldType,
        hasFile,
        submittedValue: hasFile ? undefined : submittedValue, // Only store text values, not file URLs
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logStatusChange(userId: string, oldStatus: onboarding_status, newStatus: onboarding_status, reason?: string) {
    return this.createHistoryEntry({
      userId,
      action: 'status_change',
      oldStatus,
      newStatus,
      reason,
      details: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logApproval(userId: string, adminId: string, reason?: string) {
    return this.createHistoryEntry({
      userId,
      adminId,
      action: 'approval',
      reason,
      details: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logRejection(userId: string, adminId: string, reason: string) {
    return this.createHistoryEntry({
      userId,
      adminId,
      action: 'rejection',
      reason,
      details: {
        timestamp: new Date().toISOString(),
      },
    });
  }

  async logRevisionRequest(userId: string, adminId: string, reason: string) {
    return this.createHistoryEntry({
      userId,
      adminId,
      action: 'revision_requested',
      reason,
      details: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}

import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { user_role } from '@prisma/client';

export class CreateCommissionSettingDto {
  @IsEnum(user_role)
  role: user_role;

  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateCommissionSettingDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProcessCommissionDto {
  @IsString()
  businessUserId: string;

  @IsEnum(user_role)
  businessRole: user_role;

  @IsString()
  transactionType: string;

  @IsString()
  transactionId: string;

  @IsNumber()
  @Min(0)
  transactionAmount: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class CommissionPayoutDto {
  @IsString()
  businessUserId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CommissionStatsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(user_role)
  role?: user_role;
}

export class CommissionReportDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsEnum(user_role)
  role?: user_role;

  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' | 'pdf';
}

import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { onboarding_status } from '@prisma/client';

export class CreateHistoryEntryDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  adminId?: string;

  @IsEnum(['submission', 'status_change', 'approval', 'rejection', 'revision_requested'])
  action: 'submission' | 'status_change' | 'approval' | 'rejection' | 'revision_requested';

  @IsOptional()
  @IsObject()
  details?: any;

  @IsOptional()
  @IsEnum(onboarding_status)
  oldStatus?: onboarding_status;

  @IsOptional()
  @IsEnum(onboarding_status)
  newStatus?: onboarding_status;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}


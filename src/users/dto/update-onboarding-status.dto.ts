import { IsEnum, IsOptional, IsString } from 'class-validator';
import { onboarding_status } from '@prisma/client';

export class UpdateOnboardingStatusDto {
  @IsEnum(onboarding_status)
  status: onboarding_status;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

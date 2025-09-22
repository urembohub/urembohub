import { IsOptional, IsString, IsDateString } from 'class-validator';

export class GetRetailerStatsDto {
  @IsOptional()
  @IsString()
  retailerId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
}


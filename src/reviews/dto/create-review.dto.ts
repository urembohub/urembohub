import { IsString, IsOptional, IsInt, Min, Max, IsEnum, ValidateIf } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  serviceId: string;

  @ValidateIf((o) => !o.serviceAppointmentId)
  @IsString()
  appointmentId?: string;

  @ValidateIf((o) => !o.appointmentId)
  @IsString()
  serviceAppointmentId?: string;

  @IsString()
  clientId: string;

  @IsString()
  vendorId: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  reviewText?: string;
}

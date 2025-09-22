import { IsString, IsNumber, IsEmail, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  orderId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsOptional()
  cartItems?: Array<{
    type: 'product' | 'service';
    id: string;
    name: string;
    price: number;
    quantity?: number;
    vendorId?: string;
    staffId?: string;
    appointmentDate?: string;
    durationMinutes?: number;
    currency: string;
  }>;

  @IsOptional()
  metadata?: Record<string, any>;
}

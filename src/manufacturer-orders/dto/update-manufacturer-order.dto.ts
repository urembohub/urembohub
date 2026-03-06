import { IsString, IsOptional, IsNumber, IsEnum, IsArray, IsObject } from 'class-validator';

export class UpdateManufacturerOrderDto {
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'received', 'cancelled'])
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'received' | 'cancelled';

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  shippingCarrier?: string;

  @IsOptional()
  @IsString()
  estimatedDelivery?: string;

  @IsOptional()
  @IsString()
  actualDelivery?: string;

  @IsOptional()
  @IsString()
  requestedDeliveryDate?: string;
}


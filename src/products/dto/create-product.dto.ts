import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsUUID, Min, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  imageUrl: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  subcategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  qcStatus?: string;

  @IsOptional()
  @IsUUID()
  manufacturerId?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;
}

import { IsString, IsEmail, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';

export class CreateSubaccountDto {
  @IsString()
  @Length(2, 100)
  businessName: string;

  @IsEmail()
  primaryContactEmail: string;

  @IsString()
  @Length(2, 100)
  primaryContactName: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  primaryContactPhone?: string;

  @IsString()
  @Length(2, 10)
  settlementBank: string; // Bank code

  @IsString()
  @Length(10, 10)
  accountNumber: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageCharge?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSubaccountDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  businessName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  settlementBank?: string;

  @IsOptional()
  @IsString()
  @Length(10, 10)
  accountNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageCharge?: number;

  @IsOptional()
  @IsEmail()
  primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  @Length(10, 15)
  primaryContactPhone?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class SubaccountResponseDto {
  subaccountCode: string;
  businessName: string;
  settlementBank: string;
  
  accountNumber: string;
  isVerified: boolean;
  primaryContactEmail: string;
  primaryContactName: string;
  primaryContactPhone?: string;
  percentageCharge: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

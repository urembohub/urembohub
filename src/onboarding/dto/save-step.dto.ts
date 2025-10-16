import { IsNotEmpty, IsOptional, IsString, IsNumber, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveRequirementsStepDto {
  @IsNotEmpty()
  @IsObject()
  requirements: Record<string, any>;
}

export class SaveBusinessInfoStepDto {
  @IsNotEmpty()
  @IsString()
  businessName: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @IsNotEmpty()
  @IsString()
  categoryName: string;

  @IsOptional()
  @IsNumber()
  pickupMtaaniBusinessId?: number;

  @IsOptional()
  @IsString()
  pickupMtaaniBusinessName?: string;
}

export class SavePaymentDetailsStepDto {
  @IsNotEmpty()
  @IsString()
  paymentAccountType: string;

  @IsNotEmpty()
  @IsObject()
  paymentAccountDetails: any;

  @IsOptional()
  @IsString()
  paystackSubaccountId?: string;

  @IsOptional()
  @IsString()
  paystackSubaccountCode?: string;
}

export class SaveDeliveryDetailsStepDto {
  @IsNotEmpty()
  @IsString()
  deliveryMethod: string;

  @IsNotEmpty()
  @IsObject()
  deliveryDetails: any;
}

export class StepDataResponseDto {
  requirements: Record<string, any>;
  businessInfo?: {
    businessName: string;
    phoneNumber: string;
    categoryId: number;
    categoryName: string;
    pickupMtaaniBusinessId?: number;
    pickupMtaaniBusinessName?: string;
  };
  paymentDetails?: {
    paymentAccountType: string;
    paymentAccountDetails: any;
    paystackSubaccountId?: string;
    paystackSubaccountCode?: string;
  };
  deliveryDetails?: {
    deliveryMethod: string;
    deliveryDetails: any;
  };
  completedSteps: number[];
  currentStep: number;
}





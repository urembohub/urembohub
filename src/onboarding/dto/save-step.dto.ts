import { IsNotEmpty, IsOptional, IsString, IsNumber, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SaveRequirementsStepDto {
  @IsNotEmpty()
  @IsObject()
  requirements: Record<string, any>;
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

export class StepDataResponseDto {
  requirements: Record<string, any>;
  paymentDetails?: {
    paymentAccountType: string;
    paymentAccountDetails: any;
    paystackSubaccountId?: string;
    paystackSubaccountCode?: string;
  };
  completedSteps: number[];
  currentStep: number;
}





import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUserReviewDto {
  @IsString()
  reviewedUserId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}




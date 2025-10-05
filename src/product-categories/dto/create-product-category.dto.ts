import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
} from "class-validator"

export class CreateProductCategoryDto {
  @IsString()
  @MaxLength(255)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string

  @IsNumber()
  @Min(1)
  level: number

  @IsOptional()
  @IsUUID(4, { message: "parentId must be a valid UUID" })
  parentId?: string

  @IsNumber()
  @Min(0)
  position: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsBoolean()
  showOnHomepage?: boolean
}

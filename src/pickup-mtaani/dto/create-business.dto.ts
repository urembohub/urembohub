import { IsString, IsNotEmpty, IsNumber, IsPhoneNumber } from 'class-validator'

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  phone_number: string

  @IsNumber()
  @IsNotEmpty()
  category_id: number
}





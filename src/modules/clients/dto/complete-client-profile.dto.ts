import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CompleteClientProfileDto {
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

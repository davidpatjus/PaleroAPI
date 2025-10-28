import { IsNotEmpty, IsString } from 'class-validator';

export class CreateFastClientDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

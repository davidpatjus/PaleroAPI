import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  name?: string;

  // Nota: Heredamos todos los campos opcionales de CreateUserDto
  // Los campos específicos tendrían endpoints específicos por seguridad
}

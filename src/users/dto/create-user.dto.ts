import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsEmail()
  @ValidateIf((obj: CreateUserDto) => obj.role !== 'FAST_CLIENT')
  email?: string;

  @IsNotEmpty()
  @IsString()
  name: string; // Cambiado de fullName a name para coincidir con el schema

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @ValidateIf((obj: CreateUserDto) => obj.role !== 'FAST_CLIENT')
  password?: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'TEAM_MEMBER', 'CLIENT', 'FAST_CLIENT'], {
    message: 'El rol debe ser ADMIN, TEAM_MEMBER, CLIENT o FAST_CLIENT',
  })
  role?: 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'FAST_CLIENT';
}

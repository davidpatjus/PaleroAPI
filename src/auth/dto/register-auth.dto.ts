import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';

export class RegisterAuthDto {
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsNotEmpty({ message: 'El nombre completo es requerido' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'TEAM_MEMBER', 'CLIENT'], {
    message: 'El rol debe ser ADMIN, TEAM_MEMBER o CLIENT',
  })
  role?: 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT';
}

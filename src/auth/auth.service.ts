import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { AuthResponse, JwtPayload } from './interfaces/auth.interface';
import { UUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerAuthDto: RegisterAuthDto): Promise<AuthResponse> {
    try {
      const user = await this.usersService.create({
        name: registerAuthDto.fullName, // Usar 'name' en lugar de 'fullName'
        email: registerAuthDto.email,
        password: registerAuthDto.password,
      });

      // Validar que el usuario tenga email (requerido para auth)
      if (!user.email) {
        throw new ConflictException('Error: usuario creado sin email');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
      };

      const accessToken = this.jwtService.sign(payload);

      return {
        user: {
          id: user.id,
          fullName: user.name, // Mapear name a fullName
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new ConflictException('Error al registrar usuario');
    }
  }

  async login(loginAuthDto: LoginAuthDto): Promise<AuthResponse> {
    const user = await this.validateUser(
      loginAuthDto.email,
      loginAuthDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Validar que el usuario tenga email (requerido para auth)
    if (!user.email) {
      throw new UnauthorizedException('Usuario sin acceso al sistema');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        fullName: user.name, // Mapear name a fullName
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken,
    };
  }

  async validateUser(email: string, password: string) {
    try {
      const user = await this.usersService.findByEmail(email);

      // Verificar que el usuario exista y tenga email y password
      if (user && user.email && user.password) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (isPasswordValid) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { password: _, ...result } = user;
          return result;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  async validateUserById(userId: string) {
    try {
      // Convertir string a UUID para la validación
      const user = await this.usersService.findById(userId as UUID);

      if (user) {
        return user;
      }

      return null;
    } catch {
      return null;
    }
  }
}

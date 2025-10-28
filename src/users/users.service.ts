import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../db/config';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto, CreateFastClientDto } from './dto';
import { UserResponse } from './interfaces';
import { UUID } from 'crypto';
import { ClientProfilesService } from './client-profiles.service';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private readonly clientProfilesService: ClientProfilesService) {}
  /**
   * Crear un nuevo usuario
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    // Validar que si no es FAST_CLIENT, tenga email y password
    if (createUserDto.role !== 'FAST_CLIENT') {
      if (!createUserDto.email) {
        throw new BadRequestException(
          'Email es requerido para este tipo de usuario',
        );
      }
      if (!createUserDto.password) {
        throw new BadRequestException(
          'Password es requerido para este tipo de usuario',
        );
      }
    }

    // Verificar si el email ya existe (solo si se proporciona)
    if (createUserDto.email) {
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    // Hashear la contraseña solo si se proporciona
    let hashedPassword: string | undefined;
    if (createUserDto.password) {
      hashedPassword = await bcrypt.hash(
        createUserDto.password,
        this.saltRounds,
      );
    }

    // Crear el usuario en la base de datos
    const [user] = await db
      .insert(usersTable)
      .values({
        email: createUserDto.email || null,
        name: createUserDto.name,
        password: hashedPassword || null,
        role: createUserDto.role ?? 'CLIENT',
      })
      .returning();

    // Si el usuario es CLIENT o FAST_CLIENT, crear automáticamente su ClientProfile
    if (user.role === 'FAST_CLIENT') {
      await this.clientProfilesService.create({
        userId: user.id as UUID,
        status: 'PROSPECT', // Status por defecto para nuevos clientes
      });
    }

    // Retornar el usuario sin la contraseña
    return this.excludePassword(user);
  }

  /**
   * Buscar todos los usuarios (sin contraseñas)
   */
  async findAll(): Promise<UserResponse[]> {
    const users = await db.select().from(usersTable);
    return users.map((user) => this.excludePassword(user));
  }

  /**
   * Buscar usuario por ID (sin contraseña)
   */
  async findById(id: UUID): Promise<UserResponse | null> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));

    if (!user) {
      return null;
    }

    return this.excludePassword(user);
  }

  /**
   * Buscar usuario por email (con contraseña para autenticación)
   */
  async findByEmail(email: string | null) {
    if (!email) return null;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    return user || null;
  }

  /**
   * Buscar usuario por email (sin contraseña para respuestas)
   */
  async findByEmailWithoutPassword(
    email: string,
  ): Promise<UserResponse | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }
    return this.excludePassword(user);
  }

  /**
   * Actualizar usuario por ID
   */
  async update(id: UUID, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Preparar datos de actualización
    const updateData: Partial<{
      name: string;
      email: string;
      password: string;
    }> = {};

    if (updateUserDto.name) {
      updateData.name = updateUserDto.name;
    }
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(
        updateUserDto.password,
        this.saltRounds,
      );
    }

    const [updatedUser] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, id))
      .returning();

    return this.excludePassword(updatedUser);
  }

  /**
   * Eliminar usuario por ID (hard delete ya que no hay campo isActive)
   */
  async remove(id: UUID): Promise<void> {
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await db.delete(usersTable).where(eq(usersTable.id, id));
  }

  /**
   * Validar contraseña para autenticación
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Crear un fast client (usuario sin email ni password)
   */
  async createFastClient(
    createFastClientDto: CreateFastClientDto,
  ): Promise<UserResponse> {
    // Crear el usuario en la base de datos
    const [user] = await db
      .insert(usersTable)
      .values({
        email: null,
        name: createFastClientDto.name,
        password: null,
        role: 'FAST_CLIENT',
      })
      .returning();

    // Crear automáticamente su ClientProfile básico (solo con name/companyName)
    // Los demás campos pueden completarse después
    await this.clientProfilesService.create({
      userId: user.id as UUID,
      companyName: createFastClientDto.name, // Usar el name como companyName por defecto
      status: 'PROSPECT', // Status por defecto
    });

    // Retornar el usuario sin la contraseña
    return this.excludePassword(user);
  }

  /**
   * Excluir la contraseña del objeto usuario
   */
  private excludePassword(user: {
    id: string;
    email: string | null;
    password: string | null;
    name: string;
    role: 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'FAST_CLIENT';
    createdAt: Date;
    updatedAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      email: user.email || undefined,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

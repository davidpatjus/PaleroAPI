/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { db } from '../../db/config';
import { eq } from 'drizzle-orm';
import { clientProfilesTable, usersTable } from '../../db/schema';
import { ClientProfile } from './interfaces/client.interface';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CompleteClientProfileDto } from './dto/complete-client-profile.dto';

@Injectable()
export class ClientsService {
  // Para administradores
  async create(createClientDto: CreateClientDto): Promise<ClientProfile> {
    // 1. Validar que el usuario existe y es un cliente
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, createClientDto.userId));

    if (!user) {
      throw new NotFoundException(
        `El usuario con id '${createClientDto.userId}' no existe.`,
      );
    }

    if (user.role !== 'CLIENT' && user.role !== 'FAST_CLIENT') {
      throw new BadRequestException(
        'Solo los usuarios con rol CLIENT o FAST_CLIENT pueden tener un perfil.',
      );
    }

    // 2. Validar que el perfil no exista ya
    const existing = await db
      .select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.userId, createClientDto.userId));

    if (existing.length > 0) {
      throw new ConflictException('El usuario ya tiene un perfil de cliente.');
    }

    try {
      const [newProfile] = await db
        .insert(clientProfilesTable)
        .values({
          ...createClientDto,
          status: 'ACTIVE', // Por defecto al ser creado por un admin
        })
        .returning();
      return this.toClientProfile(newProfile);
    } catch (error) {
      if (error.code === '23503') {
        throw new NotFoundException(
          `El usuario con id '${createClientDto.userId}' no existe.`,
        );
      }
      throw new InternalServerErrorException(
        'Error al crear el perfil del cliente.',
      );
    }
  }

  async findAll(): Promise<ClientProfile[]> {
    const profiles = await db.select().from(clientProfilesTable);
    return profiles.map((p) => this.toClientProfile(p));
  }

  async findOne(id: string): Promise<ClientProfile> {
    const [profile] = await db
      .select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.id, id));
    if (!profile) {
      throw new NotFoundException(
        `Perfil de cliente con id '${id}' no encontrado.`,
      );
    }
    return this.toClientProfile(profile);
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
  ): Promise<ClientProfile> {
    try {
      const [updated] = await db
        .update(clientProfilesTable)
        .set(updateClientDto)
        .where(eq(clientProfilesTable.id, id))
        .returning();
      if (!updated) {
        throw new NotFoundException(
          `Perfil de cliente con id '${id}' no encontrado.`,
        );
      }
      return this.toClientProfile(updated);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error al actualizar el perfil del cliente.',
      );
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const [deleted] = await db
      .delete(clientProfilesTable)
      .where(eq(clientProfilesTable.id, id))
      .returning();
    if (!deleted) {
      throw new NotFoundException(
        `Perfil de cliente con id '${id}' no encontrado.`,
      );
    }
    return { message: 'Perfil de cliente eliminado correctamente.' };
  }

  // Para el propio usuario cliente
  async getMyProfile(userId: string): Promise<ClientProfile> {
    const [profile] = await db
      .select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.userId, userId));
    if (!profile) {
      throw new NotFoundException(
        'El usuario no tiene un perfil de cliente creado.',
      );
    }
    return this.toClientProfile(profile);
  }

  async createMyProfile(
    userId: string,
    completeProfileDto: CompleteClientProfileDto,
  ): Promise<ClientProfile> {
    // 1. Validar que el usuario existe y es un cliente
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      throw new NotFoundException(`El usuario con id '${userId}' no existe.`);
    }

    if (user.role !== 'CLIENT' && user.role !== 'FAST_CLIENT') {
      throw new BadRequestException(
        'Solo los usuarios con rol CLIENT o FAST_CLIENT pueden tener un perfil.',
      );
    }

    // 2. Validar que el perfil no exista ya
    const existing = await db
      .select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.userId, userId));

    if (existing.length > 0) {
      throw new ConflictException('Ya has completado tu perfil de cliente.');
    }

    try {
      const [newProfile] = await db
        .insert(clientProfilesTable)
        .values({
          userId,
          ...completeProfileDto,
          status: 'ACTIVE', // Se activa al completar el perfil
        })
        .returning();
      return this.toClientProfile(newProfile);
    } catch {
      throw new InternalServerErrorException(
        'Error al crear tu perfil de cliente.',
      );
    }
  }

  private toClientProfile(entity: any): ClientProfile {
    return {
      id: entity.id,
      userId: entity.userId,
      companyName: entity.companyName,
      contactPerson: entity.contactPerson,
      phone: entity.phone,
      address: entity.address,
      socialMediaLinks: entity.socialMediaLinks,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

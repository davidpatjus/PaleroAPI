import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../db/config';
import { clientProfilesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { UUID } from 'crypto';
import {
  CreateClientProfileDto,
  UpdateClientProfileDto,
  ClientProfile,
} from './interfaces';

@Injectable()
export class ClientProfilesService {
  constructor() {}

  /**
   * Crear un perfil de cliente
   */
  async create(createClientProfileDto: CreateClientProfileDto) {
    const [clientProfile] = await db
      .insert(clientProfilesTable)
      .values({
        userId: createClientProfileDto.userId,
        companyName: createClientProfileDto.companyName,
        contactPerson: createClientProfileDto.contactPerson,
        phone: createClientProfileDto.phone,
        address: createClientProfileDto.address,
        socialMediaLinks: createClientProfileDto.socialMediaLinks,
        status: createClientProfileDto.status,
      })
      .returning();

    return clientProfile as ClientProfile;
  }

  /**
   * Buscar perfil de cliente por userId
   */
  async findByUserId(userId: UUID): Promise<ClientProfile | null> {
    const [clientProfile] = await db
      .select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.userId, userId));

    return clientProfile ? (clientProfile as ClientProfile) : null;
  }

  /**
   * Buscar perfil de cliente por ID
   */
  async findById(id: UUID): Promise<ClientProfile | null> {
    const [clientProfile] = await db
      .select()
      .from(clientProfilesTable)
      .where(eq(clientProfilesTable.id, id));

    return clientProfile ? (clientProfile as ClientProfile) : null;
  }

  /**
   * Actualizar perfil de cliente
   */
  async update(userId: UUID, updateClientProfileDto: UpdateClientProfileDto) {
    const existingProfile = await this.findByUserId(userId);
    if (!existingProfile) {
      throw new NotFoundException('Perfil de cliente no encontrado');
    }

    const [updatedProfile] = await db
      .update(clientProfilesTable)
      .set(updateClientProfileDto)
      .where(eq(clientProfilesTable.userId, userId))
      .returning();

    return updatedProfile as ClientProfile;
  }

  /**
   * Eliminar perfil de cliente
   */
  async remove(userId: UUID): Promise<void> {
    const existingProfile = await this.findByUserId(userId);
    if (!existingProfile) {
      throw new NotFoundException('Perfil de cliente no encontrado');
    }

    await db
      .delete(clientProfilesTable)
      .where(eq(clientProfilesTable.userId, userId));
  }
}

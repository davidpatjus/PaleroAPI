import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../../db/config';
import * as schema from '../../db/schema';
import { AddParticipantDto, UpdateParticipantDto } from './dto';
import { MeetingParticipant } from './interfaces';

@Injectable()
export class MeetingParticipantsService {
  /**
   * Agregar participantes a una reunión
   */
  async addParticipants(
    meetingId: string,
    addParticipantDto: AddParticipantDto,
  ): Promise<MeetingParticipant[]> {
    // Verificar que la reunión existe
    const [meeting] = await db
      .select()
      .from(schema.meetingsTable)
      .where(eq(schema.meetingsTable.id, meetingId));

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${meetingId} not found`);
    }

    const { userIds, role = 'PARTICIPANT' } = addParticipantDto;

    // Verificar que los usuarios existen
    const users = await db
      .select()
      .from(schema.usersTable)
      .where(inArray(schema.usersTable.id, userIds));

    if (users.length !== userIds.length) {
      throw new BadRequestException('Some users do not exist');
    }

    const participants: MeetingParticipant[] = [];

    for (const userId of userIds) {
      // Verificar que el participante no existe ya
      const [existing] = await db
        .select()
        .from(schema.meetingParticipantsTable)
        .where(
          and(
            eq(schema.meetingParticipantsTable.meetingId, meetingId),
            eq(schema.meetingParticipantsTable.userId, userId),
          ),
        );

      if (existing) {
        throw new ConflictException(
          `User ${userId} is already a participant in this meeting`,
        );
      }

      // Agregar participante
      const [participant] = await db
        .insert(schema.meetingParticipantsTable)
        .values({
          meetingId,
          userId,
          role,
        })
        .returning();

      participants.push(participant as MeetingParticipant);
    }

    return participants;
  }

  /**
   * Obtener todos los participantes de una reunión
   */
  async getParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    const participants = await db
      .select()
      .from(schema.meetingParticipantsTable)
      .where(eq(schema.meetingParticipantsTable.meetingId, meetingId));

    return participants as MeetingParticipant[];
  }

  /**
   * Remover un participante de una reunión
   */
  async removeParticipant(
    meetingId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const [participant] = await db
      .select()
      .from(schema.meetingParticipantsTable)
      .where(
        and(
          eq(schema.meetingParticipantsTable.meetingId, meetingId),
          eq(schema.meetingParticipantsTable.userId, userId),
        ),
      );

    if (!participant) {
      throw new NotFoundException(
        `Participant with user ID ${userId} not found in this meeting`,
      );
    }

    await db
      .delete(schema.meetingParticipantsTable)
      .where(
        and(
          eq(schema.meetingParticipantsTable.meetingId, meetingId),
          eq(schema.meetingParticipantsTable.userId, userId),
        ),
      );

    return { message: `Participant removed successfully` };
  }

  /**
   * Actualizar un participante
   */
  async updateParticipant(
    meetingId: string,
    userId: string,
    updateParticipantDto: UpdateParticipantDto,
  ): Promise<MeetingParticipant> {
    const [participant] = await db
      .select()
      .from(schema.meetingParticipantsTable)
      .where(
        and(
          eq(schema.meetingParticipantsTable.meetingId, meetingId),
          eq(schema.meetingParticipantsTable.userId, userId),
        ),
      );

    if (!participant) {
      throw new NotFoundException(
        `Participant with user ID ${userId} not found in this meeting`,
      );
    }

    const [updatedParticipant] = await db
      .update(schema.meetingParticipantsTable)
      .set({
        ...updateParticipantDto,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.meetingParticipantsTable.meetingId, meetingId),
          eq(schema.meetingParticipantsTable.userId, userId),
        ),
      )
      .returning();

    return updatedParticipant as MeetingParticipant;
  }

  /**
   * Marcar participante como unido
   */
  async markAsJoined(
    meetingId: string,
    userId: string,
  ): Promise<MeetingParticipant> {
    return this.updateParticipant(meetingId, userId, {
      status: 'JOINED',
    });
  }

  /**
   * Marcar participante como salido
   */
  async markAsLeft(
    meetingId: string,
    userId: string,
  ): Promise<MeetingParticipant> {
    return this.updateParticipant(meetingId, userId, {
      status: 'LEFT',
    });
  }
}

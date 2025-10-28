import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, or, lte, gte, notInArray } from 'drizzle-orm';
import { db } from '../../db/config';
import * as schema from '../../db/schema';
import { CreateMeetingDto, UpdateMeetingDto } from './dto';
import { DailyService } from './daily.service';
import { Meeting } from './interfaces';

@Injectable()
export class MeetingsService {
  constructor(private readonly dailyService: DailyService) {}

  /**
   * Verificar solapamiento de reuniones
   */
  private async checkOverlap(
    userId: string,
    startTime: Date,
    endTime: Date,
    projectId?: string,
    excludeMeetingId?: string,
  ): Promise<boolean> {
    // Construir query para detectar solapamiento
    const query = db
      .select()
      .from(schema.meetingsTable)
      .where(
        and(
          // Reuniones del mismo usuario
          eq(schema.meetingsTable.createdById, userId),
          // Estados activos
          notInArray(schema.meetingsTable.status, [
            'COMPLETED',
            'CANCELLED',
            'DELETED',
          ]),
          // Solapamiento de tiempo
          or(
            // Caso 1: La reunión existente empieza antes y termina después del inicio de la nueva
            and(
              lte(schema.meetingsTable.startTime, startTime),
              gte(schema.meetingsTable.endTime, startTime),
            ),
            // Caso 2: La reunión existente empieza durante la nueva reunión
            and(
              gte(schema.meetingsTable.startTime, startTime),
              lte(schema.meetingsTable.startTime, endTime),
            ),
          ),
        ),
      );

    const overlappingMeetings = await query;

    // Filtrar el meeting actual si estamos actualizando
    const filteredMeetings = excludeMeetingId
      ? overlappingMeetings.filter((m) => m.id !== excludeMeetingId)
      : overlappingMeetings;

    return filteredMeetings.length > 0;
  }

  async create(
    createMeetingDto: CreateMeetingDto,
    userId: string,
  ): Promise<Meeting> {
    const startTime = new Date(createMeetingDto.startTime);
    const endTime = new Date(createMeetingDto.endTime);

    // Validación adicional: endTime debe ser después de startTime
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    // Verificar solapamiento
    const hasOverlap = await this.checkOverlap(
      userId,
      startTime,
      endTime,
      createMeetingDto.projectId,
    );

    if (hasOverlap) {
      throw new ConflictException(
        'There is already a meeting scheduled during this time',
      );
    }

    const roomName = `PaleroSoft-Meeting-${Date.now()}`;
    const room = await this.dailyService.createRoom(roomName, false);

    const [newMeeting] = await db
      .insert(schema.meetingsTable)
      .values({
        ...createMeetingDto,
        createdById: userId, // El usuario autenticado es siempre el creador
        roomUrl: room.url,
        dailyRoomName: room.name,
        startTime,
        endTime,
      })
      .returning();

    return newMeeting as Meeting;
  }

  async findAll(): Promise<Meeting[]> {
    return db.select().from(schema.meetingsTable) as Promise<Meeting[]>;
  }

  async findOne(id: string): Promise<Meeting> {
    const [meeting] = await db
      .select()
      .from(schema.meetingsTable)
      .where(eq(schema.meetingsTable.id, id));

    if (!meeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    return meeting as Meeting;
  }

  async update(
    id: string,
    updateMeetingDto: UpdateMeetingDto,
  ): Promise<Meeting> {
    // Primero obtener la reunión existente
    const existingMeeting = await this.findOne(id);

    const updateData: Record<string, unknown> = {
      ...updateMeetingDto,
      updatedAt: new Date(),
    };

    // Convertir las fechas de string a Date si están presentes
    if (updateMeetingDto.startTime) {
      updateData.startTime = new Date(updateMeetingDto.startTime);
    }
    if (updateMeetingDto.endTime) {
      updateData.endTime = new Date(updateMeetingDto.endTime);
    }

    // Validar que endTime > startTime si se están actualizando ambas
    const finalStartTime = updateData.startTime
      ? (updateData.startTime as Date)
      : existingMeeting.startTime;
    const finalEndTime = updateData.endTime
      ? (updateData.endTime as Date)
      : existingMeeting.endTime;

    if (finalEndTime <= finalStartTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    // Verificar solapamiento si se cambian las fechas
    if (updateMeetingDto.startTime || updateMeetingDto.endTime) {
      const hasOverlap = await this.checkOverlap(
        existingMeeting.createdById,
        finalStartTime,
        finalEndTime,
        existingMeeting.projectId || undefined,
        id, // Excluir la reunión actual
      );

      if (hasOverlap) {
        throw new ConflictException(
          'There is already a meeting scheduled during this time',
        );
      }
    }

    const [updatedMeeting] = await db
      .update(schema.meetingsTable)
      .set(updateData)
      .where(eq(schema.meetingsTable.id, id))
      .returning();

    if (!updatedMeeting) {
      throw new NotFoundException(`Meeting with ID ${id} not found`);
    }
    return updatedMeeting as Meeting;
  }

  async remove(id: string): Promise<{ message: string }> {
    const meeting = await this.findOne(id);

    if (meeting.dailyRoomName) {
      await this.dailyService.deleteRoom(meeting.dailyRoomName);
    }

    await db
      .delete(schema.meetingsTable)
      .where(eq(schema.meetingsTable.id, id));

    return { message: `Meeting with ID ${id} has been removed` };
  }
}

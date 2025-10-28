/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '../../db/config';
import { eq } from 'drizzle-orm';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import {
  Subtask,
  SubtaskStatus,
  SubtaskPriority,
} from './interfaces/subtask.interface';
import { subtasksTable } from '../../db/schema';

@Injectable()
export class SubtasksService {
  async create(createSubtaskDto: CreateSubtaskDto): Promise<Subtask> {
    try {
      if (!createSubtaskDto.taskId || !createSubtaskDto.title) {
        throw new BadRequestException('taskId y title son obligatorios');
      }
      if (!Object.values(SubtaskStatus).includes(createSubtaskDto.status)) {
        throw new BadRequestException('Status de subtarea inválido');
      }
      // Insertar en la base de datos
      const [subtask] = await db
        .insert(subtasksTable)
        .values({
          taskId: createSubtaskDto.taskId,
          title: createSubtaskDto.title,
          description: createSubtaskDto.description ?? null,
          status: createSubtaskDto.status,
          priority: createSubtaskDto.priority ?? null,
          dueDate: createSubtaskDto.dueDate
            ? new Date(createSubtaskDto.dueDate)
            : null,
          assignedToId: createSubtaskDto.assignedToId ?? null,
          isCompleted: false,
        })
        .returning();
      return this.toSubtask(subtask);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Subtarea duplicada o conflicto de datos');
      }
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la subtarea');
    }
  }

  async findAll(): Promise<Subtask[]> {
    try {
      const subtasks = await db.select().from(subtasksTable);
      return subtasks.map((subtask) => this.toSubtask(subtask));
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al listar subtareas' + error.message,
      );
    }
  }

  async findOne(id: string): Promise<Subtask> {
    try {
      const [subtask] = await db
        .select()
        .from(subtasksTable)
        .where(eq(subtasksTable.id, id));
      if (!subtask) throw new NotFoundException('Subtarea no encontrada');
      return this.toSubtask(subtask);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al buscar la subtarea');
    }
  }

  async update(
    id: string,
    updateSubtaskDto: UpdateSubtaskDto,
  ): Promise<Subtask> {
    try {
      const [updated] = await db
        .update(subtasksTable)
        .set({
          ...updateSubtaskDto,
          dueDate: updateSubtaskDto.dueDate
            ? new Date(updateSubtaskDto.dueDate)
            : undefined,
        })
        .where(eq(subtasksTable.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Subtarea no encontrada');
      return this.toSubtask(updated);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Conflicto de datos al actualizar la subtarea',
        );
      }
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar la subtarea');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await db
        .delete(subtasksTable)
        .where(eq(subtasksTable.id, id))
        .returning();
      if (!result || result.length === 0)
        throw new NotFoundException('Subtarea no encontrada');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al eliminar la subtarea');
    }
  }

  // Transformador de entidad DB a interfaz Subtask
  private toSubtask(entity: any): Subtask {
    return {
      id: entity.id,
      taskId: entity.taskId,
      title: entity.title,
      description: entity.description || '',
      status: (entity.status as string).toUpperCase() as SubtaskStatus,
      priority: entity.priority
        ? ((entity.priority as string).toUpperCase() as SubtaskPriority)
        : undefined,
      dueDate: entity.dueDate
        ? entity.dueDate.toISOString().split('T')[0]
        : undefined,
      assignedToId: entity.assignedToId ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

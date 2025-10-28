/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '../../db/config';
import { tasksTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskStatus, TaskPriority } from './interfaces/task.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(private readonly notificationsService: NotificationsService) {}
  // Crear una nueva tarea
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    try {
      if (!Object.values(TaskStatus).includes(createTaskDto.status)) {
        throw new BadRequestException('Estado de tarea inválido');
      }
      // Insertar en la base de datos
      const [task] = await db
        .insert(tasksTable)
        .values({
          projectId: createTaskDto.projectId,
          title: createTaskDto.title,
          description: createTaskDto.description ?? null,
          status: createTaskDto.status,
          priority: createTaskDto.priority ?? null,
          dueDate: createTaskDto.dueDate
            ? new Date(createTaskDto.dueDate)
            : null,
          assignedToId: createTaskDto.assignedToId ?? null,
        })
        .returning();

      const createdTask = this.toTask(task);

      // 🔔 Send notification if task was assigned to someone
      if (createTaskDto.assignedToId) {
        await this.notificationsService.create({
          userId: createTaskDto.assignedToId,
          type: 'NEW_TASK_ASSIGNED',
          message: `You have been assigned a new task: "${createTaskDto.title}"`,
          entityType: 'TASK',
          entityId: task.id,
        });
      }

      return createdTask;
    } catch (error) {
      if (error.code === '23505') {
        // Código de error de duplicado en Postgres
        throw new ConflictException('Tarea duplicada o conflicto de datos');
      }
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al crear la tarea');
    }
  }

  // Listar todas las tareas
  async findAll(): Promise<Task[]> {
    try {
      const tasks = await db.select().from(tasksTable);
      return tasks.map((task) => this.toTask(task));
    } catch (error) {
      throw new InternalServerErrorException('Error al listar tareas' + error);
    }
  }

  // Buscar una tarea por ID
  async findOne(id: string): Promise<Task> {
    try {
      const [task] = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.id, id));
      if (!task) throw new NotFoundException('Tarea no encontrada');
      return this.toTask(task);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al buscar la tarea');
    }
  }

  // Actualizar una tarea
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    try {
      // Primero obtenemos la tarea actual para comparar cambios
      const [currentTask] = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.id, id));

      if (!currentTask) {
        throw new NotFoundException('Tarea no encontrada');
      }

      // Actualizamos la tarea
      const [updated] = await db
        .update(tasksTable)
        .set({
          ...updateTaskDto,
          dueDate: updateTaskDto.dueDate
            ? new Date(updateTaskDto.dueDate)
            : undefined,
        })
        .where(eq(tasksTable.id, id))
        .returning();

      if (!updated) throw new NotFoundException('Tarea no encontrada');

      // 🔔 Send notifications for relevant changes
      await this.handleTaskUpdateNotifications(
        currentTask,
        updated,
        updateTaskDto,
      );

      return this.toTask(updated);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'Conflicto de datos al actualizar la tarea',
        );
      }
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar la tarea');
    }
  }

  // Eliminar una tarea
  async remove(id: string): Promise<void> {
    try {
      const result = await db
        .delete(tasksTable)
        .where(eq(tasksTable.id, id))
        .returning();
      if (!result || result.length === 0)
        throw new NotFoundException('Tarea no encontrada');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al eliminar la tarea');
    }
  }

  // Transformador de entidad DB a interfaz Task
  private toTask(entity: any): Task {
    return {
      id: entity.id,
      projectId: entity.projectId,
      title: entity.title,
      description: entity.description || '',
      status: (entity.status as string).toUpperCase() as TaskStatus,
      priority: entity.priority
        ? ((entity.priority as string).toUpperCase() as TaskPriority)
        : undefined,
      dueDate: entity.dueDate
        ? entity.dueDate.toISOString().split('T')[0]
        : undefined,
      assignedToId: entity.assignedToId ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  // 🔔 Private method to handle notifications in task updates
  private async handleTaskUpdateNotifications(
    currentTask: any,
    updatedTask: any,
    updateDto: UpdateTaskDto,
  ): Promise<void> {
    // Notification for status change
    if (updateDto.status && currentTask.status !== updatedTask.status) {
      const statusNames = {
        TODO: 'To Do',
        IN_PROGRESS: 'In Progress',
        REVIEW: 'Under Review',
        DONE: 'Completed',
      };

      // Notify assigned user (if exists)
      if (updatedTask.assignedToId) {
        await this.notificationsService.create({
          userId: updatedTask.assignedToId,
          type: 'TASK_STATUS_UPDATED',
          message: `Your task "${updatedTask.title}" status changed to: ${statusNames[updatedTask.status] || updatedTask.status}`,
          entityType: 'TASK',
          entityId: updatedTask.id,
        });
      }
    }

    // Notification for new assignment
    if (
      updateDto.assignedToId &&
      currentTask.assignedToId !== updatedTask.assignedToId
    ) {
      // Notify newly assigned user
      if (updatedTask.assignedToId) {
        await this.notificationsService.create({
          userId: updatedTask.assignedToId,
          type: 'NEW_TASK_ASSIGNED',
          message: `You have been assigned the task: "${updatedTask.title}"`,
          entityType: 'TASK',
          entityId: updatedTask.id,
        });
      }
    }
  }
}

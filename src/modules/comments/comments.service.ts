/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { db } from '../../db/config';
import { eq } from 'drizzle-orm';
import { commentsTable, tasksTable, projectsTable } from '../../db/schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './interfaces/comment.interface';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(private readonly notificationsService: NotificationsService) {}
  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    try {
      if (!createCommentDto.content || !createCommentDto.userId) {
        throw new BadRequestException('Content and userId are required');
      }
      if (!createCommentDto.taskId && !createCommentDto.projectId) {
        throw new BadRequestException(
          'Comment must be associated with a task or project',
        );
      }

      const [comment] = await db
        .insert(commentsTable)
        .values({
          taskId: createCommentDto.taskId ?? null,
          projectId: createCommentDto.projectId ?? null,
          userId: createCommentDto.userId,
          content: createCommentDto.content,
        })
        .returning();

      // Send notifications based on comment association
      if (comment.taskId) {
        // Get task information to get assigned users
        const [task] = await db
          .select()
          .from(tasksTable)
          .where(eq(tasksTable.id, comment.taskId));

        if (task && task.assignedToId && task.assignedToId !== comment.userId) {
          await this.notificationsService.create({
            userId: task.assignedToId,
            type: 'COMMENT_CREATED',
            message: `New comment added to task: ${task.title}`,
            content: comment.content, // Include comment content for preview
            entityType: 'TASK',
            entityId: comment.taskId,
          });
        }
      } else if (comment.projectId) {
        // Get project information to get client
        const [project] = await db
          .select()
          .from(projectsTable)
          .where(eq(projectsTable.id, comment.projectId));

        if (project && project.clientId) {
          await this.notificationsService.create({
            userId: project.clientId,
            type: 'COMMENT_CREATED',
            message: `New comment added to project: ${project.name}`,
            content: comment.content, // Include comment content for preview
            entityType: 'PROJECT',
            entityId: comment.projectId,
          });
        }
      }

      return this.toComment(comment);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error creating comment');
    }
  }

  async findAll(): Promise<Comment[]> {
    try {
      const comments = await db.select().from(commentsTable);
      return comments.map((c) => this.toComment(c));
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al listar comentarios' + error.message,
      );
    }
  }

  async findOne(id: string): Promise<Comment> {
    try {
      const [comment] = await db
        .select()
        .from(commentsTable)
        .where(eq(commentsTable.id, id));
      if (!comment) throw new NotFoundException('Comentario no encontrado');
      return this.toComment(comment);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al buscar el comentario');
    }
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<Comment> {
    try {
      const [updated] = await db
        .update(commentsTable)
        .set({ ...updateCommentDto })
        .where(eq(commentsTable.id, id))
        .returning();
      if (!updated) throw new NotFoundException('Comentario no encontrado');
      return this.toComment(updated);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error al actualizar el comentario',
      );
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const result = await db
        .delete(commentsTable)
        .where(eq(commentsTable.id, id))
        .returning();
      if (!result || result.length === 0)
        throw new NotFoundException('Comentario no encontrado');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al eliminar el comentario');
    }
  }

  private toComment(entity: any): Comment {
    return {
      id: entity.id,
      taskId: entity.taskId ?? undefined,
      projectId: entity.projectId ?? undefined,
      userId: entity.userId,
      content: entity.content,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}

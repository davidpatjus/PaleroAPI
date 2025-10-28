/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/config';
import { notificationsTable } from '../../db/schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './interfaces/notification.interface';

@Injectable()
export class NotificationsService {
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const [notification] = await db
      .insert(notificationsTable)
      .values({
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        message: createNotificationDto.message,
        content: createNotificationDto.content || null,
        entityType: createNotificationDto.entityType || null,
        entityId: createNotificationDto.entityId || null,
        isRead: false, // Siempre empieza como no leída
      })
      .returning();

    return notification as Notification;
  }

  async findByUser(userId: string): Promise<Notification[]> {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt));

    return notifications as Notification[];
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification | null> {
    const [updatedNotification] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      )
      .returning();

    return (updatedNotification as Notification) || null;
  }

  // Find all notifications (for admin use)
  async findAll(): Promise<Notification[]> {
    const notifications = await db
      .select()
      .from(notificationsTable)
      .orderBy(desc(notificationsTable.createdAt));

    return notifications as Notification[];
  }
}

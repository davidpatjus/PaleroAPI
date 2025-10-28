import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Notification } from './interfaces/notification.interface';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findUserNotifications(
    @Request() req: { user: { id: string } },
  ): Promise<{
    success: boolean;
    data: Notification[];
    message: string;
  }> {
    const userId = req.user.id;
    const notifications = await this.notificationsService.findByUser(userId);

    return {
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully',
    };
  }

  @Get('admin/all')
  @HttpCode(HttpStatus.OK)
  async findAllNotifications(
    @Request() req: { user: { id: string; role: string } },
  ): Promise<{
    success: boolean;
    data: Notification[];
    message: string;
  }> {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only administrators can access all notifications',
      );
    }

    const notifications = await this.notificationsService.findAll();

    return {
      success: true,
      data: notifications,
      message: 'All notifications retrieved successfully',
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') notificationId: string,
    @Request() req: { user: { id: string } },
  ): Promise<{
    success: boolean;
    data: Notification;
    message: string;
  }> {
    const userId = req.user.id;

    const updatedNotification = await this.notificationsService.markAsRead(
      notificationId,
      userId,
    );

    if (!updatedNotification) {
      throw new NotFoundException(
        'Notification not found or does not belong to user',
      );
    }

    return {
      success: true,
      data: updatedNotification,
      message: 'Notification marked as read',
    };
  }
}

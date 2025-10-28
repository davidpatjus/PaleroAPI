import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { NotificationType } from '../interfaces/notification.interface';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum([
    'NEW_TASK_ASSIGNED',
    'TASK_STATUS_UPDATED',
    'NEW_COMMENT',
    'PROJECT_STATUS_UPDATED',
    'INVOICE_GENERATED',
    'PAYMENT_REMINDER',
    'NEW_MESSAGE',
  ])
  type: NotificationType;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

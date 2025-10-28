export type NotificationType =
  | 'NEW_TASK_ASSIGNED'
  | 'TASK_STATUS_UPDATED'
  | 'NEW_COMMENT'
  | 'COMMENT_CREATED'
  | 'PROJECT_CREATED'
  | 'PROJECT_STATUS_UPDATED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_REMINDER'
  | 'NEW_MESSAGE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  content?: string | null; // Optional content for previews (e.g., comment content)
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: Date;
}

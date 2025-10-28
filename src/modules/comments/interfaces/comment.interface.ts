export interface Comment {
  id: string;
  taskId?: string;
  projectId?: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

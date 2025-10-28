export enum SubtaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum SubtaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  description?: string;
  status: SubtaskStatus;
  priority?: SubtaskPriority;
  dueDate?: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}

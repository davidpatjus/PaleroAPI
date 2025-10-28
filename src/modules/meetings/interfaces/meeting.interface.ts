export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  status:
    | 'SCHEDULED'
    | 'WAITING_ROOM'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'FAILED'
    | 'DELETED';
  projectId?: string | null;
  createdById: string;
  roomUrl?: string | null;
  dailyRoomName?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

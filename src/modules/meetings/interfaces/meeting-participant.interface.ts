export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  role: 'HOST' | 'PARTICIPANT' | 'OBSERVER';
  status: 'INVITED' | 'JOINED' | 'LEFT' | 'REJECTED';
  joinedAt?: Date | null;
  leftAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

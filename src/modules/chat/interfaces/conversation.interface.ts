// Interface para conversación 1 a 1 (respuesta completa)
export interface Conversation {
  id: string;
  userOneId: string;
  userTwoId: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para conversación con datos del otro participante (para UI)
export interface ConversationWithParticipant {
  id: string;
  otherUser: {
    id: string;
    name: string;
    email?: string;
    role: 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'FAST_CLIENT';
  };
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para crear una conversación
export interface CreateConversationPayload {
  recipientId: string;
  initialMessage?: string;
}

// Interface para el resultado de crear/obtener conversación
export interface ConversationResult {
  conversation: Conversation;
  isNew: boolean;
}

// Tipos de estado de conversación
export type ConversationStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

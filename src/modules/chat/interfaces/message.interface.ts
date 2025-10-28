// Interface para mensaje completo
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
}

// Interface para mensaje con datos del sender (para UI)
export interface MessageWithSender {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    name: string;
    email?: string;
  };
  content: string;
  sentAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
  isMine: boolean; // true si es del usuario actual
}

// Interface para enviar un mensaje
export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

// Interface para marcar mensajes como leídos
export interface MarkAsReadPayload {
  conversationId: string;
  messageIds?: string[]; // Opcional: IDs específicos, si no se pasa marca todos como leídos
}

// Interface para el resultado de enviar mensaje
export interface SendMessageResult {
  message: Message;
  conversation: {
    id: string;
    lastMessageAt: Date;
    lastMessagePreview: string;
  };
}

// Estados de entrega del mensaje
export type MessageDeliveryStatus = 'SENT' | 'DELIVERED' | 'READ';

// Tipos de contenido de mensaje (para futuras expansiones)
export type MessageContentType = 'TEXT' | 'IMAGE' | 'FILE' | 'EMOJI';

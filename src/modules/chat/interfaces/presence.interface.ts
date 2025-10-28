// Interface para el estado de presencia de un usuario en tiempo real
export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  lastSeen?: Date;
  isTyping: boolean;
  conversationId?: string; // En qué conversación está escribiendo
}

// Interface para el estado de presencia en Supabase Realtime
export interface SupabasePresenceState {
  user_id: string;
  status: PresenceStatus;
  last_seen?: string; // ISO string
  is_typing: boolean;
  conversation_id?: string;
  joined_at: string; // ISO string
}

// Interface para eventos de typing
export interface TypingEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: Date;
}

// Interface para configuración de Supabase Realtime
export interface RealtimeConfig {
  supabaseUrl: string;
  supabaseKey: string;
  jwtToken: string;
}

// Interface para suscripción a canal de chat
export interface ChatChannelSubscription {
  conversationId: string;
  userId: string;
  onMessageReceived: (message: any) => void;
  onMessageUpdated: (message: any) => void;
  onPresenceUpdate: (presence: UserPresence[]) => void;
  onTypingUpdate: (typing: TypingEvent) => void;
}

// Estados de presencia disponibles
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

// Tipos de eventos en tiempo real
export type RealtimeEventType =
  | 'MESSAGE_SENT'
  | 'MESSAGE_READ'
  | 'USER_TYPING'
  | 'USER_ONLINE'
  | 'USER_OFFLINE';

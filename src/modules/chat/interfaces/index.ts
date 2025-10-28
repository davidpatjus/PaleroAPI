// Conversation interfaces
export type {
  Conversation,
  ConversationWithParticipant,
  CreateConversationPayload,
  ConversationResult,
  ConversationStatus,
} from './conversation.interface';

// Message interfaces
export type {
  Message,
  MessageWithSender,
  SendMessagePayload,
  MarkAsReadPayload,
  SendMessageResult,
  MessageDeliveryStatus,
  MessageContentType,
} from './message.interface';

// Presence interfaces
export type {
  UserPresence,
  SupabasePresenceState,
  TypingEvent,
  RealtimeConfig,
  ChatChannelSubscription,
  PresenceStatus,
  RealtimeEventType,
} from './presence.interface';

// Supabase interfaces
export type {
  SupabaseAuthTokens,
  SupabaseClientConfig,
  RLSPolicy,
  SupabaseAuthResponse,
  SupabaseError,
  SupabaseRealtimeEvent,
  RealtimeChannelConfig,
  SupabaseJWTPayload,
  SupabaseResponse,
  SupabaseQueryBuilder,
  SupabaseClient,
} from './supabase.interface';

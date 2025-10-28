// Interface para tokens de autenticación de Supabase
export interface SupabaseAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  userId: string;
}

// Interface para configuración del cliente Supabase
export interface SupabaseClientConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

// Interface para políticas de Row Level Security
export interface RLSPolicy {
  tableName: string;
  policyName: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  using?: string; // SQL expression
  withCheck?: string; // SQL expression para INSERT/UPDATE
}

// Interface para respuesta de autenticación con Supabase
export interface SupabaseAuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
  expiresIn: number;
}

// Interface para errores de Supabase
export interface SupabaseError {
  message: string;
  code?: string;
  details?: any;
  hint?: string;
}

// Tipos de operaciones de Supabase Realtime
export type SupabaseRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

// Configuración de canal de Realtime
export interface RealtimeChannelConfig {
  schema: string;
  table: string;
  filter?: string;
  event: SupabaseRealtimeEvent | '*';
}

// Interface para JWT Payload de Supabase
export interface SupabaseJWTPayload {
  sub: string;
  email: string;
  aud: string;
  role: string;
  iat: number;
  exp: number;
  user_metadata?: {
    user_id: string;
    email: string;
    [key: string]: unknown;
  };
}

// Interface para respuesta genérica de Supabase
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

// Interface para query builder de Supabase
export interface SupabaseQueryBuilder<T = unknown> {
  select: (columns?: string) => SupabaseQueryBuilder<T>;
  insert: (values: Partial<T> | Partial<T>[]) => SupabaseQueryBuilder<T>;
  update: (values: Partial<T>) => SupabaseQueryBuilder<T>;
  delete: () => SupabaseQueryBuilder<T>;
  eq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  neq: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  gt: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  gte: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  lt: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  lte: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  like: (column: string, pattern: string) => SupabaseQueryBuilder<T>;
  ilike: (column: string, pattern: string) => SupabaseQueryBuilder<T>;
  is: (column: string, value: null | boolean) => SupabaseQueryBuilder<T>;
  in: (column: string, values: unknown[]) => SupabaseQueryBuilder<T>;
  contains: (column: string, value: unknown) => SupabaseQueryBuilder<T>;
  or: (filters: string) => SupabaseQueryBuilder<T>;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => SupabaseQueryBuilder<T>;
  limit: (count: number) => SupabaseQueryBuilder<T>;
  range: (from: number, to: number) => SupabaseQueryBuilder<T>;
  single: () => Promise<SupabaseResponse<T>>;
  maybeSingle: () => Promise<SupabaseResponse<T | null>>;
  then: <TResult1 = SupabaseResponse<T[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseResponse<T[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

// Interface para el cliente de Supabase
export interface SupabaseClient {
  from: <T = unknown>(table: string) => SupabaseQueryBuilder<T>;
  auth: {
    signInWithPassword: (credentials: {
      email: string;
      password: string;
    }) => Promise<SupabaseResponse<{ user: unknown; session: unknown }>>;
    signOut: () => Promise<SupabaseResponse<null>>;
    getUser: () => Promise<SupabaseResponse<unknown>>;
    getSession: () => Promise<SupabaseResponse<unknown>>;
  };
  channel: (name: string) => unknown;
  removeChannel: (channel: unknown) => Promise<unknown>;
}

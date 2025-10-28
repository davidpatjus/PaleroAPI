/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createClient } from '@supabase/supabase-js';
import {
  SupabaseAuthTokens,
  SupabaseClientConfig,
  RealtimeChannelConfig,
} from './interfaces';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly supabaseClient: any;
  private readonly supabaseAdminClient: any;
  private readonly config: SupabaseClientConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    // Configuración desde variables de entorno
    this.config = {
      url: this.configService.getOrThrow<string>('SUPABASE_URL'),
      anonKey: this.configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
      serviceRoleKey: this.configService.getOrThrow<string>(
        'SUPABASE_SERVICE_KEY',
      ),
    };

    // Cliente público (con anon key)
    this.supabaseClient = createClient(this.config.url, this.config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Cliente administrativo (con service role key)
    this.supabaseAdminClient = createClient(
      this.config.url,
      this.config.serviceRoleKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    this.logger.log('SupabaseService inicializado correctamente');
  }

  // --- GESTIÓN DE TOKENS JWT ---

  /**
   * Genera un JWT personalizado para autenticación con Supabase
   * Este token permitirá que el frontend se conecte directamente a Supabase Realtime
   */
  generateSupabaseJWT(userId: string, email: string): SupabaseAuthTokens {
    try {
      const supabaseJwtSecret = this.configService.getOrThrow<string>(
        'SUPABASE_JWT_SECRET',
      );
      const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora

      // Payload sin exp/iat manualmente (dejamos que jsonwebtoken los genere)
      const payload = {
        sub: userId,
        email: email,
        aud: 'authenticated',
        role: 'authenticated',
        iss: supabaseUrl,
        // Añadir claims personalizados si es necesario
        user_metadata: {
          user_id: userId,
          email: email,
        },
      };

      // Generar el token con expiresIn (jsonwebtoken añadirá exp automáticamente)
      const accessToken = this.jwtService.sign(payload, {
        secret: supabaseJwtSecret,
        algorithm: 'HS256',
        expiresIn: '1h', // 1 hora
      });

      this.logger.log(`JWT generado para usuario: ${userId}`);

      return {
        accessToken,
        expiresAt,
        userId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error generando JWT de Supabase: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException(
        'Error generando token de autenticación',
      );
    }
  }

  /**
   * Valida un JWT de Supabase
   */
  validateSupabaseJWT(token: string): { userId: string; email: string } {
    try {
      const supabaseJwtSecret = this.configService.getOrThrow<string>(
        'SUPABASE_JWT_SECRET',
      );

      const payload: any = this.jwtService.verify(token, {
        secret: supabaseJwtSecret,
      });

      return {
        userId: payload.sub as string,
        email: payload.email as string,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'JWT inválido';
      this.logger.warn(`JWT inválido: ${errorMessage}`);
      throw new UnauthorizedException('Token de Supabase inválido');
    }
  }

  // --- GESTIÓN DE REALTIME ---

  /**
   * Configura y retorna los parámetros necesarios para suscribirse a un canal de Realtime
   */
  getRealtimeChannelConfig(
    tableName: string,
    filter?: string,
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  ): RealtimeChannelConfig {
    return {
      schema: 'public',
      table: tableName,
      filter: filter || undefined,
      event: event || '*',
    };
  }

  /**
   * Genera la configuración completa para el cliente frontend de Supabase
   */
  getClientConfig(userId: string, email: string) {
    const tokens = this.generateSupabaseJWT(userId, email);

    return {
      supabaseUrl: this.config.url,
      supabaseAnonKey: this.config.anonKey,
      accessToken: tokens.accessToken,
      expiresAt: tokens.expiresAt,
      channels: {
        // Canal para mensajes de todas las conversaciones del usuario
        messages: this.getRealtimeChannelConfig('messages'),
        // Canal para actualizaciones de conversaciones
        conversations: this.getRealtimeChannelConfig('conversations'),
      },
    };
  }

  // --- GESTIÓN DE ROW LEVEL SECURITY ---

  /**
   * Valida que el usuario tenga acceso a una conversación específica
   * (Usado como respaldo a las políticas RLS)
   */
  async validateConversationAccess(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseAdminClient
        .from('conversations')
        .select('id')
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
        .eq('id', conversationId)
        .single();

      if (error) {
        const errorMessage =
          typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : 'Unknown error';
        this.logger.warn(
          `Error validando acceso a conversación: ${errorMessage}`,
        );
        return false;
      }

      return !!data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Error en validateConversationAccess: ${errorMessage}`,
        errorStack,
      );
      return false;
    }
  }

  /**
   * Obtiene estadísticas de uso de Realtime (para monitoreo)
   */
  getRealtimeStats(): {
    activeConnections: number;
    messagesPerSecond: number;
    status: 'healthy' | 'degraded' | 'down';
  } {
    try {
      // Aquí podrían ir llamadas a APIs de monitoreo de Supabase
      // Por ahora retornamos datos mock
      return {
        activeConnections: 0,
        messagesPerSecond: 0,
        status: 'healthy',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error obteniendo estadísticas de Realtime: ${errorMessage}`,
      );
      return {
        activeConnections: 0,
        messagesPerSecond: 0,
        status: 'down',
      };
    }
  }

  // --- MÉTODOS DE UTILIDAD ---

  /**
   * Retorna el cliente público de Supabase (solo para casos especiales)
   */
  getPublicClient(): any {
    return this.supabaseClient;
  }

  /**
   * Retorna el cliente administrativo de Supabase (solo para operaciones internas)
   */
  getAdminClient(): any {
    return this.supabaseAdminClient;
  }

  /**
   * Verifica la conectividad con Supabase
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'error';
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      const { error } = await this.supabaseClient
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        const errorMessage =
          typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : 'Unknown error';
        return { status: 'error', error: errorMessage };
      }

      const latency = Date.now() - startTime;
      return { status: 'ok', latency };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return { status: 'error', error: errorMessage };
    }
  }
}

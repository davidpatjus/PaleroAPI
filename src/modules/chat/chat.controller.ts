import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Patch,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SupabaseService } from './supabase.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CreateConversationDto,
  SendMessageDto,
  MarkAsReadDto,
  GetConversationsDto,
  GetMessagesDto,
} from './dto';
import {
  Conversation,
  ConversationWithParticipant,
  MessageWithSender,
  SendMessageResult,
  SupabaseAuthTokens,
} from './interfaces';

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Obtener token de Supabase para conexión Realtime
   * GET /api/chat/supabase-token
   */
  @Get('supabase-token')
  @HttpCode(HttpStatus.OK)
  getSupabaseToken(@Request() req: RequestWithUser): SupabaseAuthTokens {
    const { id: userId, email } = req.user;
    return this.supabaseService.generateSupabaseJWT(userId, email);
  }

  /**
   * Obtener configuración completa del cliente de Supabase
   * GET /api/chat/supabase-config
   */
  @Get('supabase-config')
  @HttpCode(HttpStatus.OK)
  getSupabaseConfig(
    @Request() req: RequestWithUser,
  ): ReturnType<typeof this.supabaseService.getClientConfig> {
    const { id: userId, email } = req.user;
    return this.supabaseService.getClientConfig(userId, email);
  }

  /**
   * Crear o obtener una conversación 1 a 1
   * POST /api/chat/conversations
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createOrGetConversation(
    @Request() req: RequestWithUser,
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<Conversation> {
    // Log para debugging
    this.logger.log(
      `Creando conversación - Usuario: ${req.user.id}, Destinatario: ${createConversationDto.recipientId}`,
    );

    // Validación adicional
    if (!createConversationDto.recipientId) {
      throw new BadRequestException(
        'El campo recipientId es requerido y no puede estar vacío',
      );
    }

    const currentUserId = req.user.id;
    const result = await this.chatService.createOrGetConversation(
      createConversationDto,
      currentUserId,
    );

    return result.conversation;
  }

  /**
   * Obtener todas las conversaciones del usuario
   * GET /api/chat/conversations
   */
  @Get('conversations')
  @HttpCode(HttpStatus.OK)
  async getUserConversations(
    @Request() req: RequestWithUser,
    @Query() query: GetConversationsDto,
  ): Promise<ConversationWithParticipant[]> {
    const userId = req.user.id;
    return this.chatService.getUserConversations(userId, query);
  }

  /**
   * Obtener una conversación específica por ID
   * GET /api/chat/conversations/:id
   */
  @Get('conversations/:id')
  @HttpCode(HttpStatus.OK)
  async getConversationById(
    @Request() req: RequestWithUser,
    @Param('id') conversationId: string,
  ): Promise<Conversation> {
    const userId = req.user.id;
    return this.chatService.getConversationById(conversationId, userId);
  }

  /**
   * Enviar un mensaje en una conversación
   * POST /api/chat/messages
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req: RequestWithUser,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<SendMessageResult> {
    const senderId = req.user.id;
    return this.chatService.sendMessage(sendMessageDto, senderId);
  }

  /**
   * Obtener mensajes de una conversación
   * GET /api/chat/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  async getMessages(
    @Request() req: RequestWithUser,
    @Param('id') conversationId: string,
    @Query() query: GetMessagesDto,
  ): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
    const userId = req.user.id;

    // Validar que el conversationId sea un UUID válido
    if (
      !conversationId ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        conversationId,
      )
    ) {
      throw new BadRequestException(
        'El ID de conversación debe ser un UUID válido',
      );
    }

    // Construir el DTO completo con el conversationId del param
    const messagesQuery: GetMessagesDto = {
      conversationId,
      limit: query.limit,
      cursor: query.cursor,
    };

    return this.chatService.getMessages(messagesQuery, userId);
  }

  /**
   * Marcar mensajes como leídos
   * PATCH /api/chat/messages/mark-read
   */
  @Patch('messages/mark-read')
  @HttpCode(HttpStatus.OK)
  async markMessagesAsRead(
    @Request() req: RequestWithUser,
    @Body() markAsReadDto: MarkAsReadDto,
  ): Promise<{ success: boolean; count: number }> {
    const userId = req.user.id;
    const result = await this.chatService.markMessagesAsRead(
      markAsReadDto,
      userId,
    );
    return {
      success: result.updatedCount > 0,
      count: result.updatedCount,
    };
  }

  /**
   * Health check de Supabase
   * GET /api/chat/health
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{
    status: string;
    supabase: { status: 'ok' | 'error'; latency?: number; error?: string };
  }> {
    const supabaseHealth = await this.supabaseService.healthCheck();
    return {
      status: supabaseHealth.status === 'ok' ? 'healthy' : 'degraded',
      supabase: supabaseHealth,
    };
  }
}

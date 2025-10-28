import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { db } from '../../db/config';
import { conversationsTable, messagesTable, usersTable } from '../../db/schema';
import { and, eq, or, desc, lt, sql, count, inArray } from 'drizzle-orm';
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
  ConversationResult,
  MessageWithSender,
  SendMessageResult,
} from './interfaces';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // --- GESTIÓN DE CONVERSACIONES ---

  async createOrGetConversation(
    dto: CreateConversationDto,
    currentUserId: string,
  ): Promise<ConversationResult> {
    // Validar que recipientId no sea undefined o vacío
    if (!dto.recipientId) {
      throw new BadRequestException(
        'El ID del destinatario es requerido y no puede estar vacío',
      );
    }

    // Validar que no trate de crear conversación consigo mismo
    if (currentUserId === dto.recipientId) {
      throw new BadRequestException(
        'No puedes crear una conversación contigo mismo',
      );
    }

    // Validar que el destinatario existe
    const [recipient] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, dto.recipientId))
      .limit(1);

    if (!recipient) {
      throw new NotFoundException(
        `Usuario destinatario no encontrado: ${dto.recipientId}`,
      );
    }

    // Ordenar IDs para consistencia (el menor siempre va en userOneId)
    const [userOneId, userTwoId] = [currentUserId, dto.recipientId].sort();

    this.logger.log(
      `Buscando conversación - userOneId: ${userOneId}, userTwoId: ${userTwoId}`,
    );

    // Buscar conversación existente
    let [existingConversation] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.userOneId, userOneId),
          eq(conversationsTable.userTwoId, userTwoId),
        ),
      )
      .limit(1);

    this.logger.log(
      `Conversación existente encontrada: ${existingConversation ? existingConversation.id : 'No encontrada'}`,
    );

    let isNew = false;

    // Si no existe, crear nueva conversación
    if (!existingConversation) {
      const [newConversation] = await db
        .insert(conversationsTable)
        .values({
          userOneId,
          userTwoId,
        })
        .returning();

      existingConversation = newConversation;
      isNew = true;

      this.logger.log(`Nueva conversación creada: ${existingConversation.id}`);

      // Enviar mensaje inicial si se proporciona
      if (dto.initialMessage) {
        await this.sendMessage(
          {
            conversationId: existingConversation.id,
            content: dto.initialMessage,
          },
          currentUserId,
        );
      }
    }

    return {
      conversation: {
        ...existingConversation,
        lastMessageAt: existingConversation.lastMessageAt || undefined,
        lastMessagePreview:
          existingConversation.lastMessagePreview || undefined,
      },
      isNew,
    };
  }

  async getUserConversations(
    userId: string,
    dto: GetConversationsDto,
  ): Promise<ConversationWithParticipant[]> {
    const page = parseInt(dto.page || '1', 10);
    const limit = Math.min(parseInt(dto.limit || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Query optimizada usando LEFT JOIN para obtener datos del otro usuario
    const conversations = await db
      .select({
        conversation: conversationsTable,
        otherUser: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          role: usersTable.role,
        },
      })
      .from(conversationsTable)
      .leftJoin(
        usersTable,
        sql`CASE 
          WHEN ${conversationsTable.userOneId} = ${userId} 
          THEN ${conversationsTable.userTwoId} = ${usersTable.id}
          ELSE ${conversationsTable.userOneId} = ${usersTable.id}
        END`,
      )
      .where(
        or(
          eq(conversationsTable.userOneId, userId),
          eq(conversationsTable.userTwoId, userId),
        ),
      )
      .orderBy(
        desc(conversationsTable.lastMessageAt),
        desc(conversationsTable.updatedAt),
      )
      .limit(limit)
      .offset(offset);

    // Calcular mensajes no leídos para cada conversación
    const conversationsWithUnreadCount = await Promise.all(
      conversations.map(async ({ conversation, otherUser }) => {
        if (!otherUser) {
          this.logger.warn(
            `Usuario no encontrado para conversación ${conversation.id}`,
          );
          return null;
        }

        // Contar mensajes no leídos (enviados por el otro usuario)
        const [unreadResult] = await db
          .select({ count: count() })
          .from(messagesTable)
          .where(
            and(
              eq(messagesTable.conversationId, conversation.id),
              eq(messagesTable.senderId, otherUser.id),
              sql`${messagesTable.readAt} IS NULL`,
            ),
          );

        return {
          id: conversation.id,
          otherUser,
          lastMessageAt: conversation.lastMessageAt || undefined,
          lastMessagePreview: conversation.lastMessagePreview || undefined,
          unreadCount: unreadResult?.count || 0,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        } as ConversationWithParticipant;
      }),
    );

    return conversationsWithUnreadCount.filter(
      (conv): conv is ConversationWithParticipant => conv !== null,
    );
  }

  // --- GESTIÓN DE MENSAJES ---

  async sendMessage(
    dto: SendMessageDto,
    senderId: string,
  ): Promise<SendMessageResult> {
    // Validar que el usuario es participante de la conversación
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, dto.conversationId),
          or(
            eq(conversationsTable.userOneId, senderId),
            eq(conversationsTable.userTwoId, senderId),
          ),
        ),
      )
      .limit(1);

    if (!conversation) {
      throw new ForbiddenException(
        'No tienes permisos para enviar mensajes en esta conversación',
      );
    }

    // Insertar el mensaje
    const [newMessage] = await db
      .insert(messagesTable)
      .values({
        conversationId: dto.conversationId,
        senderId,
        content: dto.content.trim(),
      })
      .returning();

    // Actualizar metadatos de la conversación
    const messagePreview = dto.content.trim().substring(0, 100);
    await db
      .update(conversationsTable)
      .set({
        lastMessageAt: newMessage.sentAt,
        lastMessagePreview: messagePreview,
        updatedAt: new Date(),
      })
      .where(eq(conversationsTable.id, dto.conversationId));

    this.logger.log(
      `Mensaje enviado: ${newMessage.id} en conversación ${dto.conversationId}`,
    );

    return {
      message: {
        ...newMessage,
        readAt: newMessage.readAt || undefined,
        deliveredAt: newMessage.deliveredAt || undefined,
      },
      conversation: {
        id: conversation.id,
        lastMessageAt: newMessage.sentAt,
        lastMessagePreview: messagePreview,
      },
    };
  }

  async getMessages(
    dto: GetMessagesDto,
    userId: string,
  ): Promise<{ messages: MessageWithSender[]; hasMore: boolean }> {
    // Validar que conversationId esté presente
    if (!dto.conversationId) {
      throw new BadRequestException('El ID de conversación es requerido');
    }

    // Validar acceso a la conversación
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, dto.conversationId),
          or(
            eq(conversationsTable.userOneId, userId),
            eq(conversationsTable.userTwoId, userId),
          ),
        ),
      )
      .limit(1);

    if (!conversation) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    const limit = Math.min(parseInt(dto.limit || '50', 10), 100);
    const whereConditions = [
      eq(messagesTable.conversationId, dto.conversationId),
    ];

    // Cursor-based pagination para mejor rendimiento
    if (dto.cursor) {
      whereConditions.push(lt(messagesTable.sentAt, new Date(dto.cursor)));
    }

    // Obtener mensajes con datos del sender
    const messages = await db
      .select({
        message: messagesTable,
        sender: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        },
      })
      .from(messagesTable)
      .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(and(...whereConditions))
      .orderBy(desc(messagesTable.sentAt))
      .limit(limit + 1); // +1 para saber si hay más

    const hasMore = messages.length > limit;
    const resultMessages = messages.slice(0, limit);

    const messagesWithSender: MessageWithSender[] = resultMessages.map(
      ({ message, sender }) => ({
        ...message,
        readAt: message.readAt || undefined,
        deliveredAt: message.deliveredAt || undefined,
        sender: sender
          ? {
              id: sender.id,
              name: sender.name,
              email: sender.email || undefined,
            }
          : {
              id: message.senderId,
              name: 'Usuario eliminado',
              email: undefined,
            },
        isMine: message.senderId === userId,
      }),
    );

    return {
      messages: messagesWithSender,
      hasMore,
    };
  }

  async markMessagesAsRead(
    dto: MarkAsReadDto,
    readerId: string,
  ): Promise<{ updatedCount: number }> {
    // Validar acceso a la conversación
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, dto.conversationId),
          or(
            eq(conversationsTable.userOneId, readerId),
            eq(conversationsTable.userTwoId, readerId),
          ),
        ),
      )
      .limit(1);

    if (!conversation) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    // Log de depuración: verificar mensajes antes de marcar
    const messagesToCheck = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, dto.conversationId));

    this.logger.debug(
      `Total mensajes en conversación: ${messagesToCheck.length}`,
    );
    this.logger.debug(
      `Mensajes del usuario actual (${readerId}): ${messagesToCheck.filter((m) => m.senderId === readerId).length}`,
    );
    this.logger.debug(
      `Mensajes de otros usuarios: ${messagesToCheck.filter((m) => m.senderId !== readerId).length}`,
    );
    this.logger.debug(
      `Mensajes no leídos de otros: ${messagesToCheck.filter((m) => m.senderId !== readerId && !m.readAt).length}`,
    );

    if (dto.messageIds && dto.messageIds.length > 0) {
      this.logger.debug(
        `Buscando mensajes específicos: ${dto.messageIds.join(', ')}`,
      );
      const specificMessages = messagesToCheck.filter((m) =>
        dto.messageIds!.includes(m.id),
      );
      this.logger.debug(
        `Mensajes encontrados con esos IDs: ${specificMessages.length}`,
      );
      specificMessages.forEach((m) => {
        this.logger.debug(
          `  - Mensaje ${m.id}: sender=${m.senderId}, readAt=${m.readAt ? m.readAt.toISOString() : 'NULL'}`,
        );
      });
    }

    const whereConditions = [
      eq(messagesTable.conversationId, dto.conversationId),
      sql`${messagesTable.senderId} != ${readerId}`, // Solo mensajes recibidos
      sql`${messagesTable.readAt} IS NULL`, // Solo no leídos
    ];

    // Si se especifican IDs de mensajes, filtrar por ellos
    if (dto.messageIds && dto.messageIds.length > 0) {
      whereConditions.push(inArray(messagesTable.id, dto.messageIds));
    }

    const updatedMessages = await db
      .update(messagesTable)
      .set({ readAt: new Date() })
      .where(and(...whereConditions))
      .returning({ id: messagesTable.id });

    this.logger.log(
      `Marcados como leídos ${updatedMessages.length} mensajes en conversación ${dto.conversationId}`,
    );

    return { updatedCount: updatedMessages.length };
  }

  // --- MÉTODOS AUXILIARES ---

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, conversationId),
          or(
            eq(conversationsTable.userOneId, userId),
            eq(conversationsTable.userTwoId, userId),
          ),
        ),
      )
      .limit(1);

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return {
      ...conversation,
      lastMessageAt: conversation.lastMessageAt || undefined,
      lastMessagePreview: conversation.lastMessagePreview || undefined,
    };
  }
}

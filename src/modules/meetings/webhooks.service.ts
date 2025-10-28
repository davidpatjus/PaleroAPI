import { Injectable, Logger } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { db } from '../../db/config';
import * as schema from '../../db/schema';
import { DailyWebhookDto } from './dto';
import { MeetingParticipantsService } from './meeting-participants.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly participantsService: MeetingParticipantsService,
  ) {}

  async handleDailyWebhook(webhookDto: DailyWebhookDto): Promise<any> {
    const { type, payload } = webhookDto;

    this.logger.log(`Received webhook: ${type} for room: ${payload.room}`);

    try {
      // Buscar la reunión por el dailyRoomUrl
      const meeting = await this.findMeetingByRoomUrl(payload.room);

      if (!meeting) {
        this.logger.warn(`Meeting not found for room: ${payload.room}`);
        return { message: 'Meeting not found', status: 'ignored' };
      }

      switch (type) {
        case 'meeting.started':
        case 'room.created':
          return await this.handleMeetingStarted(meeting.id);

        case 'meeting.ended':
        case 'room.deleted':
          return await this.handleMeetingEnded(meeting.id);

        case 'participant.joined':
          return await this.handleParticipantJoined(
            meeting.id,
            payload.participant?.user_id,
            payload.participant?.user_name,
          );

        case 'participant.left':
          return await this.handleParticipantLeft(
            meeting.id,
            payload.participant?.user_id,
          );

        default:
          this.logger.warn(`Unhandled webhook type: ${type}`);
          return { message: 'Webhook type not handled', type };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error handling webhook: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  private async findMeetingByRoomUrl(
    roomUrl: string,
  ): Promise<{ id: string } | null> {
    // El roomUrl puede venir como nombre de sala o URL completa
    const roomName = roomUrl.split('/').pop() || roomUrl;

    // Buscar por roomUrl exacto o por dailyRoomName
    const [meeting] = await db
      .select()
      .from(schema.meetingsTable)
      .where(
        or(
          eq(schema.meetingsTable.roomUrl, roomUrl),
          eq(schema.meetingsTable.dailyRoomName, roomName),
        ),
      )
      .limit(1);

    return meeting || null;
  }

  private async handleMeetingStarted(meetingId: string): Promise<any> {
    const [updatedMeeting] = await db
      .update(schema.meetingsTable)
      .set({
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      })
      .where(eq(schema.meetingsTable.id, meetingId))
      .returning();

    this.logger.log(`Meeting ${meetingId} started`);
    return { message: 'Meeting started', meeting: updatedMeeting };
  }

  private async handleMeetingEnded(meetingId: string): Promise<any> {
    const [updatedMeeting] = await db
      .update(schema.meetingsTable)
      .set({
        status: 'COMPLETED',
        updatedAt: new Date(),
      })
      .where(eq(schema.meetingsTable.id, meetingId))
      .returning();

    this.logger.log(`Meeting ${meetingId} ended`);
    return { message: 'Meeting ended', meeting: updatedMeeting };
  }

  private async handleParticipantJoined(
    meetingId: string,
    userId?: string,
    userName?: string,
  ): Promise<any> {
    if (!userId) {
      this.logger.warn('Participant joined without user_id');
      return { message: 'No user_id provided' };
    }

    try {
      await this.participantsService.markAsJoined(meetingId, userId);
      this.logger.log(`Participant ${userId} joined meeting ${meetingId}`);
      return { message: 'Participant joined', userId, userName };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Participant ${userId} not found in database, skipping update: ${errorMessage}`,
      );
      return { message: 'Participant not in database', userId };
    }
  }

  private async handleParticipantLeft(
    meetingId: string,
    userId?: string,
  ): Promise<any> {
    if (!userId) {
      this.logger.warn('Participant left without user_id');
      return { message: 'No user_id provided' };
    }

    try {
      await this.participantsService.markAsLeft(meetingId, userId);
      this.logger.log(`Participant ${userId} left meeting ${meetingId}`);
      return { message: 'Participant left', userId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Participant ${userId} not found in database, skipping update: ${errorMessage}`,
      );
      return { message: 'Participant not in database', userId };
    }
  }
}

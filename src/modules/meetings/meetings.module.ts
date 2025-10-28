import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MeetingsService } from './meetings.service';
import { MeetingsController, WebhooksController } from './meetings.controller';
import { DailyService } from './daily.service';
import { MeetingParticipantsService } from './meeting-participants.service';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [ConfigModule],
  controllers: [MeetingsController, WebhooksController],
  providers: [
    MeetingsService,
    DailyService,
    MeetingParticipantsService,
    WebhooksService,
  ],
  exports: [MeetingsService, MeetingParticipantsService, WebhooksService],
})
export class MeetingsModule {}

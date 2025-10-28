import {
  IsString,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ParticipantObject {
  @IsString()
  user_id: string;

  @IsString()
  @IsOptional()
  user_name?: string;
}

class WebhookPayload {
  @IsString()
  room: string;

  @IsString()
  @IsOptional()
  mtg_session_id?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ParticipantObject)
  participant?: ParticipantObject;
}

export class DailyWebhookDto {
  @IsString()
  type: string; // 'meeting.started', 'meeting.ended', 'participant.joined', 'participant.left'

  @IsObject()
  @ValidateNested()
  @Type(() => WebhookPayload)
  payload: WebhookPayload;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  timestamp?: string;
}

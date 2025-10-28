import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { meetingStatusEnum } from 'src/db/schema';
import { IsAfter } from '../decorators/is-after.decorator';

export class UpdateMeetingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  @IsAfter('startTime', { message: 'endTime must be after startTime' })
  endTime?: string;

  @IsEnum(meetingStatusEnum.enumValues)
  @IsOptional()
  status?: (typeof meetingStatusEnum.enumValues)[number];

  @IsUUID()
  @IsOptional()
  projectId?: string;
}

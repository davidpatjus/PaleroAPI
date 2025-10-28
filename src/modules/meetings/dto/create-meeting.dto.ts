import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { IsAfter } from '../decorators/is-after.decorator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  @IsAfter('startTime', { message: 'endTime must be after startTime' })
  endTime: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;
}

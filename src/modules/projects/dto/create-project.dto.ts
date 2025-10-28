import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ProjectStatus } from '../interfaces/project.interface';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  clientId: string;

  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

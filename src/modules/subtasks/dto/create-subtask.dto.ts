import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import {
  SubtaskStatus,
  SubtaskPriority,
} from '../interfaces/subtask.interface';

export class CreateSubtaskDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SubtaskStatus)
  @IsNotEmpty()
  status: SubtaskStatus;

  @IsEnum(SubtaskPriority)
  @IsOptional()
  priority?: SubtaskPriority;

  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;
}

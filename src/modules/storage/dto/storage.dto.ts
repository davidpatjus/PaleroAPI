import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty({ message: 'Bucket is required' })
  @IsEnum(['images', 'files'], { message: 'Invalid bucket' })
  bucket: string;

  @IsNotEmpty({ message: 'Folder is required' })
  @IsEnum(
    ['profiles', 'projects', 'tasks', 'comments', 'documents', 'avatars'],
    {
      message: 'Invalid folder',
    },
  )
  folder: string;

  @IsNotEmpty({ message: 'Entity type is required' })
  @IsEnum(['PROJECT', 'TASK', 'CLIENT_DOCUMENT', 'PROFILE_IMAGE'], {
    message: 'Invalid entity type',
  })
  entityType: string;

  @IsNotEmpty({ message: 'Entity ID is required' })
  @IsUUID('4', { message: 'Invalid entity ID format' })
  entityId: string;

  @IsNotEmpty({ message: 'Uploaded by ID is required' })
  @IsUUID('4', { message: 'Invalid uploaded by ID format' })
  uploadedById: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Custom file name is too long' })
  customFileName?: string;
}

export class GetDownloadUrlDto {
  @IsNotEmpty({ message: 'Bucket is required' })
  @IsEnum(['images', 'files'], { message: 'Invalid bucket' })
  bucket: string;

  @IsNotEmpty({ message: 'File path is required' })
  @IsString()
  filePath: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(60, { message: 'Expires in must be at least 60 seconds' })
  @Max(86400, { message: 'Expires in cannot exceed 24 hours' })
  expiresIn?: number;
}

export class ListFilesDto {
  @IsOptional()
  @IsEnum(['PROJECT', 'TASK', 'CLIENT_DOCUMENT', 'PROFILE_IMAGE'], {
    message: 'Invalid entity type',
  })
  entityType?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid entity ID format' })
  entityId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invalid uploaded by ID format' })
  uploadedById?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Offset must be at least 0' })
  offset?: number;
}

export class DeleteFileDto {
  @IsNotEmpty({ message: 'Deleted by ID is required' })
  @IsUUID('4', { message: 'Invalid deleted by ID format' })
  deletedBy: string;
}

export class GetPublicUrlDto {
  @IsNotEmpty({ message: 'Bucket is required' })
  @IsEnum(['images', 'files'], { message: 'Invalid bucket' })
  bucket: string;

  @IsNotEmpty({ message: 'File path is required' })
  @IsString()
  filePath: string;
}

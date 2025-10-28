// Tipos basados en el schema de base de datos (fileAttachmentsTable)
export type FileEntityType =
  | 'PROJECT'
  | 'TASK'
  | 'CLIENT_DOCUMENT'
  | 'PROFILE_IMAGE';
export type StorageBucket = 'images' | 'files';
export type StorageFolder =
  | 'profiles'
  | 'projects'
  | 'tasks'
  | 'comments'
  | 'documents';

// Categorías de archivos para validación
export enum FileCategory {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

// Configuración por tipo de archivo
export interface FileTypeConfig {
  maxFileSize: number; // en bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

// Interfaz de archivo (coherente con fileAttachmentsTable)
export interface FileAttachment {
  id: string;
  entityType: FileEntityType;
  entityId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  uploadedById: string;
  createdAt: Date;
}

// Opciones para subir archivo
export interface UploadFileOptions {
  bucket: StorageBucket;
  folder: StorageFolder;
  entityType: FileEntityType;
  entityId: string;
  uploadedById: string;
  customFileName?: string;
  metadata?: Record<string, unknown>;
}

// Opciones de descarga
export interface DownloadFileOptions {
  bucket: StorageBucket;
  filePath: string;
  expiresIn?: number;
}

// Opciones de listado
export interface ListFilesOptions {
  entityType?: FileEntityType;
  entityId?: string;
  uploadedById?: string;
  limit?: number;
  offset?: number;
}

// Opciones de eliminación
export interface DeleteFileOptions {
  fileId: string;
  deletedBy: string;
}

// Resultado de subida
export interface UploadResult {
  success: boolean;
  data?: FileAttachment & {
    publicUrl?: string;
    signedUrl?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Resultado de validación
export interface FileValidation {
  isValid: boolean;
  error?: string;
}

// Información de bucket
export interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

// Estadísticas de storage
export interface StorageStats {
  totalFiles: number;
  totalSize: number; // en bytes
  buckets: Array<{
    name: string;
    fileCount: number;
    size: number;
  }>;
}

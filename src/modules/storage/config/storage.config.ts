import { FileCategory, FileTypeConfig } from '../interfaces/storage.interfaces';

// Constantes de buckets
export const STORAGE_BUCKETS = {
  IMAGES: 'images',
  FILES: 'files',
} as const;

// Constantes de carpetas organizacionales
export const STORAGE_FOLDERS = {
  PROFILES: 'profiles',
  PROJECTS: 'projects',
  TASKS: 'tasks',
  COMMENTS: 'comments',
  DOCUMENTS: 'documents',
} as const;

// Configuraciones específicas por categoría de archivo
export const FILE_TYPE_CONFIGS: Record<FileCategory, FileTypeConfig> = {
  [FileCategory.IMAGE]: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  [FileCategory.DOCUMENT]: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
  },
  [FileCategory.VIDEO]: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    allowedExtensions: ['.mp4', '.mpeg', '.mov'],
  },
  [FileCategory.AUDIO]: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
    allowedExtensions: ['.mp3', '.wav', '.ogg'],
  },
  [FileCategory.OTHER]: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: ['application/zip', 'application/x-rar-compressed'],
    allowedExtensions: ['.zip', '.rar'],
  },
};

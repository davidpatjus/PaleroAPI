/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../../db/config';
import {
  fileAttachmentsTable,
  projectsTable,
  tasksTable,
  usersTable,
} from '../../db/schema';
import {
  UploadFileOptions,
  UploadResult,
  DownloadFileOptions,
  ListFilesOptions,
  FileAttachment,
  DeleteFileOptions,
  FileValidation,
  FileCategory,
  StorageBucket,
  BucketInfo,
  StorageStats,
} from './interfaces/storage.interfaces';
import { FILE_TYPE_CONFIGS } from './config/storage.config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('❌ Supabase credentials are missing');
      throw new InternalServerErrorException(
        'Storage service configuration error',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('✅ StorageService initialized successfully');
  }

  /**
   * Inicializar buckets si no existen
   */
  async initializeBuckets(): Promise<void> {
    try {
      this.logger.log('🔧 Initializing storage buckets...');

      await this.createBucketIfNotExists('images', true);
      await this.createBucketIfNotExists('files', false);

      this.logger.log('✅ Storage buckets initialized successfully');
    } catch (error) {
      this.logger.error('❌ Error initializing buckets:', error);
      throw new InternalServerErrorException(
        'Failed to initialize storage buckets',
      );
    }
  }

  /**
   * Subir archivo con validaciones completas y guardado en BD
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadFileOptions,
  ): Promise<UploadResult> {
    try {
      this.logger.log(
        `📤 Uploading file: ${file.originalname} for ${options.entityType}:${options.entityId}`,
      );

      // 1. Validar archivo
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        this.logger.warn(`⚠️ File validation failed: ${validation.error}`);
        throw new BadRequestException(validation.error);
      }

      // 2. Validar que la entidad existe
      await this.validateEntity(options.entityType, options.entityId);

      // 3. Validar que el usuario existe
      await this.validateUser(options.uploadedById);

      // 4. Generar nombre único y ruta
      const fileName = options.customFileName || this.generateFileName(file);
      const storagePath = this.buildFilePath(
        options.folder,
        fileName,
        options.entityId,
      );

      // 5. Subir a Supabase Storage
      // El buffer de Multer es compatible con Supabase
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from(options.bucket)
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

      if (uploadError) {
        this.logger.error('❌ Supabase upload error:', uploadError);
        throw new InternalServerErrorException(
          `Upload failed: ${uploadError.message}`,
        );
      }

      // 6. Obtener URL pública si corresponde
      let publicUrl: string | undefined;
      if (options.bucket === 'images') {
        const { data: urlData } = this.supabase.storage
          .from(options.bucket)
          .getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }

      // 7. Guardar metadatos en la base de datos
      const [fileRecord] = await db
        .insert(fileAttachmentsTable)
        .values({
          fileName: file.originalname,
          filePath: uploadData.path,
          fileType: file.mimetype,
          entityType: options.entityType,
          entityId: options.entityId,
          uploadedById: options.uploadedById,
        })
        .returning();

      this.logger.log(
        `✅ File uploaded successfully: ${fileRecord.id} - ${fileRecord.fileName}`,
      );

      // 8. Retornar resultado
      const fileAttachment: FileAttachment = {
        id: fileRecord.id,
        entityType: fileRecord.entityType,
        entityId: fileRecord.entityId,
        fileName: fileRecord.fileName,
        filePath: fileRecord.filePath,
        fileType: fileRecord.fileType,
        uploadedById: fileRecord.uploadedById,
        createdAt: fileRecord.createdAt,
      };

      return {
        success: true,
        data: {
          ...fileAttachment,
          publicUrl,
        },
      };
    } catch (error) {
      this.logger.error('❌ Upload error:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Upload failed unexpectedly',
        },
      };
    }
  }

  /**
   * Obtener URL de descarga firmada
   */
  async getDownloadUrl(options: DownloadFileOptions): Promise<string | null> {
    try {
      const expiresIn = options.expiresIn || 3600; // 1 hora por defecto
      this.logger.log(
        `🔗 Creating signed URL for: ${options.filePath} (expires in ${expiresIn}s)`,
      );

      const { data, error } = await this.supabase.storage
        .from(options.bucket)
        .createSignedUrl(options.filePath, expiresIn);

      if (error || !data) {
        this.logger.error('❌ Error creating signed URL:', error);
        return null;
      }

      this.logger.log('✅ Signed URL created successfully');
      return data.signedUrl;
    } catch (error) {
      this.logger.error('❌ Unexpected error creating signed URL:', error);
      return null;
    }
  }

  /**
   * Obtener URL pública
   */
  getPublicUrl(bucket: StorageBucket, filePath: string): string {
    this.logger.log(`🔗 Getting public URL for: ${bucket}/${filePath}`);
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  /**
   * Listar archivos por entidad
   */
  async listFiles(options: ListFilesOptions): Promise<FileAttachment[]> {
    try {
      this.logger.log(
        `📂 Listing files with options: ${JSON.stringify(options)}`,
      );

      let query = db.select().from(fileAttachmentsTable);

      // Filtrar por tipo de entidad
      if (options.entityType) {
        query = query.where(
          eq(fileAttachmentsTable.entityType, options.entityType),
        ) as typeof query;
      }

      // Filtrar por ID de entidad
      if (options.entityId) {
        query = query.where(
          eq(fileAttachmentsTable.entityId, options.entityId),
        ) as typeof query;
      }

      // Filtrar por usuario que subió
      if (options.uploadedById) {
        query = query.where(
          eq(fileAttachmentsTable.uploadedById, options.uploadedById),
        ) as typeof query;
      }

      // Aplicar paginación
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      query = query.limit(limit).offset(offset) as typeof query;

      const files = await query;

      this.logger.log(`✅ Found ${files.length} files`);

      return files.map((file) => ({
        id: file.id,
        entityType: file.entityType,
        entityId: file.entityId,
        fileName: file.fileName,
        filePath: file.filePath,
        fileType: file.fileType,
        uploadedById: file.uploadedById,
        createdAt: file.createdAt,
      }));
    } catch (error) {
      this.logger.error('❌ Error listing files:', error);
      throw new InternalServerErrorException('Error listing files');
    }
  }

  /**
   * Eliminar archivo (de storage y BD)
   */
  async deleteFile(options: DeleteFileOptions): Promise<boolean> {
    try {
      this.logger.log(`🗑️ Deleting file: ${options.fileId}`);

      // 1. Buscar archivo en BD
      const [file] = await db
        .select()
        .from(fileAttachmentsTable)
        .where(eq(fileAttachmentsTable.id, options.fileId))
        .limit(1);

      if (!file) {
        this.logger.warn(`⚠️ File not found: ${options.fileId}`);
        throw new NotFoundException('File not found');
      }

      // 2. Determinar bucket
      const bucket: StorageBucket = file.fileType.startsWith('image/')
        ? 'images'
        : 'files';

      this.logger.log(
        `🗑️ Deleting from bucket: ${bucket}, path: ${file.filePath}`,
      );

      // 3. Eliminar de Supabase Storage
      const { data: deleteData, error: storageError } =
        await this.supabase.storage.from(bucket).remove([file.filePath]);

      if (storageError) {
        this.logger.error('❌ Storage delete error:', storageError);
        // Lanzar error si falla el borrado del storage
        throw new InternalServerErrorException(
          `Failed to delete file from storage: ${storageError.message}`,
        );
      }

      this.logger.log(
        `✅ File deleted from storage: ${deleteData?.length || 0} files removed`,
      );

      // 4. Eliminar registro de BD
      await db
        .delete(fileAttachmentsTable)
        .where(eq(fileAttachmentsTable.id, options.fileId));

      this.logger.log(
        `✅ File record deleted from database: ${options.fileId}`,
      );
      return true;
    } catch (error) {
      this.logger.error('❌ Delete file error:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Error deleting file');
    }
  }

  /**
   * Obtener información de los buckets
   */
  async getBuckets(): Promise<BucketInfo[]> {
    try {
      this.logger.log('📊 Listing buckets');
      const { data, error } = await this.supabase.storage.listBuckets();

      if (error) {
        this.logger.error('❌ Error listing buckets:', error);
        return [];
      }

      return data.map((bucket) => ({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        createdAt: bucket.created_at,
        updatedAt: bucket.updated_at,
      }));
    } catch (error) {
      this.logger.error('❌ Unexpected error listing buckets:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas del storage
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      this.logger.log('📈 Getting storage statistics');

      // Obtener total de archivos en BD
      const files = await db.select().from(fileAttachmentsTable);

      const stats: StorageStats = {
        totalFiles: files.length,
        totalSize: 0,
        buckets: [
          {
            name: 'images',
            fileCount: 0,
            size: 0,
          },
          {
            name: 'files',
            fileCount: 0,
            size: 0,
          },
        ],
      };

      // Aquí podrías agregar lógica para obtener tamaños reales de Supabase
      // Por ahora retornamos información básica

      this.logger.log(`✅ Stats: ${stats.totalFiles} total files`);
      return stats;
    } catch (error) {
      this.logger.error('❌ Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        buckets: [],
      };
    }
  }

  /**
   * Validar entidad relacionada existe en BD
   */
  private async validateEntity(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    let exists = false;

    switch (entityType) {
      case 'PROJECT': {
        const [project] = await db
          .select()
          .from(projectsTable)
          .where(eq(projectsTable.id, entityId))
          .limit(1);
        exists = !!project;
        if (!exists) {
          this.logger.warn(`⚠️ Project not found: ${entityId}`);
        }
        break;
      }

      case 'TASK': {
        const [task] = await db
          .select()
          .from(tasksTable)
          .where(eq(tasksTable.id, entityId))
          .limit(1);
        exists = !!task;
        if (!exists) {
          this.logger.warn(`⚠️ Task not found: ${entityId}`);
        }
        break;
      }

      case 'CLIENT_DOCUMENT': {
        // Para documentos de cliente, validamos que el usuario existe
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, entityId))
          .limit(1);
        exists = !!user;
        if (!exists) {
          this.logger.warn(`⚠️ User not found: ${entityId}`);
        }
        break;
      }

      case 'PROFILE_IMAGE': {
        // Para imágenes de perfil, validamos que el usuario existe
        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, entityId))
          .limit(1);
        exists = !!user;
        if (!exists) {
          this.logger.warn(`⚠️ User not found: ${entityId}`);
        }
        break;
      }
    }

    if (!exists) {
      throw new NotFoundException(
        `${entityType} with ID ${entityId} not found`,
      );
    }
  }

  /**
   * Validar usuario existe
   */
  private async validateUser(userId: string): Promise<void> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      this.logger.warn(`⚠️ User not found: ${userId}`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * Validar archivo antes de subir
   */
  private validateFile(file: Express.Multer.File): FileValidation {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (!file.mimetype) {
      return { isValid: false, error: 'File MIME type is missing' };
    }

    // Type guard: asegurar que mimetype es string
    const mimeType: string = file.mimetype;
    const fileCategory = this.determineFileCategory(mimeType);
    const config = FILE_TYPE_CONFIGS[fileCategory];

    // Validar tamaño
    if (file.size > config.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds limit of ${config.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    // Validar tipo MIME
    if (!config.allowedMimeTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: `File type ${mimeType} is not allowed`,
      };
    }

    // Validar extensión
    if (!file.originalname) {
      return { isValid: false, error: 'File name is missing' };
    }

    // Type guard: asegurar que originalname es string
    const originalName: string = file.originalname;
    const fileExtension = extname(originalName).toLowerCase();
    if (!config.allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File extension ${fileExtension} is not allowed`,
      };
    }

    return { isValid: true };
  }

  /**
   * Determinar categoría de archivo
   */
  private determineFileCategory(mimeType: string): FileCategory {
    if (mimeType.startsWith('image/')) return FileCategory.IMAGE;
    if (mimeType.startsWith('video/')) return FileCategory.VIDEO;
    if (mimeType.startsWith('audio/')) return FileCategory.AUDIO;
    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.includes('text/')
    ) {
      return FileCategory.DOCUMENT;
    }
    return FileCategory.OTHER;
  }

  /**
   * Generar nombre único de archivo
   */
  private generateFileName(file: Express.Multer.File): string {
    // Type guard: asegurar que originalname es string
    const originalName: string = file.originalname || 'file';
    const extension = extname(originalName);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}${extension}`;
  }

  /**
   * Construir ruta del archivo en storage
   */
  private buildFilePath(
    folder: string,
    fileName: string,
    entityId: string,
  ): string {
    return `${folder}/${entityId}/${fileName}`;
  }

  /**
   * Crear bucket si no existe
   */
  private async createBucketIfNotExists(
    bucketName: string,
    isPublic: boolean,
  ): Promise<void> {
    const { data: buckets } = await this.supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

    if (!bucketExists) {
      this.logger.log(`🔧 Creating bucket: ${bucketName}`);
      const { error } = await this.supabase.storage.createBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
      });

      if (error && !error.message.includes('already exists')) {
        this.logger.error(`❌ Error creating bucket ${bucketName}:`, error);
        throw error;
      }

      this.logger.log(`✅ Bucket created: ${bucketName}`);
    }
  }
}

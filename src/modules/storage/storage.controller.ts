import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import {
  UploadFileDto,
  GetDownloadUrlDto,
  DeleteFileDto,
  ListFilesDto,
  GetPublicUrlDto,
} from './dto/storage.dto';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * POST /storage/upload
   * Subir un archivo al storage
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.storageService.uploadFile(file, {
      bucket: uploadDto.bucket as 'images' | 'files',
      folder: uploadDto.folder as
        | 'profiles'
        | 'projects'
        | 'tasks'
        | 'comments'
        | 'documents',
      entityType: uploadDto.entityType as
        | 'PROJECT'
        | 'TASK'
        | 'CLIENT_DOCUMENT'
        | 'PROFILE_IMAGE',
      entityId: uploadDto.entityId,
      uploadedById: uploadDto.uploadedById,
      customFileName: uploadDto.customFileName,
    });

    if (!result.success) {
      throw new HttpException(
        {
          message: result.error?.message || 'Upload failed',
          code: result.error?.code || 'UPLOAD_ERROR',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      message: 'File uploaded successfully',
      data: result.data,
    };
  }

  /**
   * GET /storage/download
   * Obtener URL firmada para descargar un archivo
   */
  @Get('download')
  async getDownloadUrl(@Query() downloadDto: GetDownloadUrlDto) {
    const signedUrl = await this.storageService.getDownloadUrl({
      bucket: downloadDto.bucket as 'images' | 'files',
      filePath: downloadDto.filePath,
      expiresIn: downloadDto.expiresIn,
    });

    if (!signedUrl) {
      throw new HttpException(
        'Could not generate download URL',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      signedUrl,
      expiresIn: downloadDto.expiresIn || 3600,
    };
  }

  /**
   * GET /storage/public-url
   * Obtener URL pública de un archivo
   */
  @Get('public-url')
  getPublicUrl(@Query() publicUrlDto: GetPublicUrlDto) {
    const publicUrl = this.storageService.getPublicUrl(
      publicUrlDto.bucket as 'images' | 'files',
      publicUrlDto.filePath,
    );

    return {
      publicUrl,
    };
  }

  /**
   * GET /storage/list
   * Listar archivos filtrados
   */
  @Get('list')
  async listFiles(@Query() listDto: ListFilesDto) {
    const files = await this.storageService.listFiles({
      entityType: listDto.entityType as
        | 'PROJECT'
        | 'TASK'
        | 'CLIENT_DOCUMENT'
        | 'PROFILE_IMAGE'
        | undefined,
      entityId: listDto.entityId,
      uploadedById: listDto.uploadedById,
      limit: listDto.limit,
      offset: listDto.offset,
    });

    return {
      files,
      total: files.length,
      limit: listDto.limit || 50,
      offset: listDto.offset || 0,
    };
  }

  /**
   * DELETE /storage/:fileId
   * Eliminar un archivo
   */
  @Delete(':fileId')
  async deleteFile(
    @Param('fileId') fileId: string,
    @Body() deleteDto: DeleteFileDto,
  ) {
    const success = await this.storageService.deleteFile({
      fileId: fileId,
      deletedBy: deleteDto.deletedBy,
    });

    if (!success) {
      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      message: 'File deleted successfully',
      fileId: fileId, // <-- Retornar el fileId correcto
    };
  }

  /**
   * GET /storage/buckets
   * Obtener información de los buckets
   */
  @Get('buckets')
  async getBuckets() {
    const buckets = await this.storageService.getBuckets();
    return {
      buckets,
      total: buckets.length,
    };
  }

  /**
   * POST /storage/initialize
   * Inicializar buckets necesarios
   */
  @Post('initialize')
  async initializeBuckets() {
    await this.storageService.initializeBuckets();
    return {
      message: 'Storage buckets initialized successfully',
    };
  }

  /**
   * GET /storage/stats
   * Obtener estadísticas del storage
   */
  @Get('stats')
  async getStorageStats() {
    const stats = await this.storageService.getStorageStats();
    return stats;
  }
}

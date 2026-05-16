/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { MinioFileDto } from './dtos/minio-file.dto';
import { S3FileInfo, S3FileStat, SupabaseS3Client } from './supabase-s3.client';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject('MINIO_CLIENT')
    private readonly minioClient: SupabaseS3Client,
    private readonly configService: ConfigService,
  ) {
    const bucketName = this.configService.get<string>('MINIO_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('MINIO_BUCKET_NAME is required');
    }

    this.bucketName = bucketName;
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);

      if (exists) {
        this.logger.log(`MinIO bucket already exists: ${this.bucketName}`);
        return;
      }

      this.logger.log(`Creating MinIO bucket: ${this.bucketName}`);
      await this.minioClient.createBucket(this.bucketName);
      this.logger.log(`MinIO bucket created: ${this.bucketName}`);
    } catch (error: any) {
      const errorName = error?.code || error?.name;

      if (errorName === 'BucketAlreadyExists' || errorName === 'BucketAlreadyOwnedByYou') {
        this.logger.log(`MinIO bucket already exists: ${this.bucketName}`);
        return;
      }

      this.logger.error(
        `Failed to initialize MinIO bucket: ${error?.message || error}`,
      );
      this.logger.warn(
        'MinIO is not available. Backup/restore features will not work.',
      );
    }
  }

  async uploadFile(fileName: string, filePath: string): Promise<void> {
    try {
      await this.minioClient.putObject(this.bucketName, fileName, filePath);
    } catch (error) {
      throw new HttpException(
        'Failed to upload file to MinIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async downloadFile(
    fileName: string,
    destinationPath: string,
  ): Promise<void> {
    try {
      await this.minioClient.downloadObject(this.bucketName, fileName, destinationPath);
    } catch (error: any) {
      if (error?.code === 'NoSuchKey') {
        throw new NotFoundException(`File ${fileName} not found in MinIO`);
      }
      throw new HttpException(
        'Failed to download file from MinIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.minioClient.deleteObject(this.bucketName, fileName);
    } catch (error: any) {
      if (error?.code === 'NoSuchKey') {
        throw new NotFoundException(`File ${fileName} not found in MinIO`);
      }
      throw new HttpException(
        'Failed to delete file from MinIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listFiles(): Promise<MinioFileDto[]> {
    try {
      const files = await this.minioClient.listObjects(this.bucketName);

      return files.map((file) => ({
        fileName: file.fileName,
        size: file.size,
        etag: file.etag,
        lastModified: file.lastModified,
      }));
    } catch (error) {
      throw new HttpException(
        'Failed to list files from MinIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileUrl(fileName: string, expiresIn = 3600) {
    try {
      return this.minioClient.getSignedObjectUrl(this.bucketName, fileName, expiresIn);
    } catch (error: any) {
      if (error?.code === 'NoSuchKey') {
        throw new NotFoundException(`File ${fileName} not found in MinIO`);
      }
      throw new HttpException(
        'Failed to generate presigned URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileStat(fileName: string): Promise<S3FileStat> {
    try {
      return this.minioClient.headObject(this.bucketName, fileName);
    } catch (error: any) {
      if (error?.code === 'NoSuchKey') {
        throw new NotFoundException(`File ${fileName} not found in MinIO`);
      }
      throw new HttpException(
        'Failed to get file stats from MinIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

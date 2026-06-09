/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { MinioFileDto } from './dtos/minio-file.dto';

type S3Body = Readable | NodeReadableStream | Blob;

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject('MINIO_CLIENT')
    private readonly minioClient: S3Client,
    private readonly configService: ConfigService,
  ) {
    const bucketName =
      this.configService.get<string>('STORAGE_BUCKET_NAME') ??
      this.configService.get<string>('MINIO_BUCKET_NAME');
    if (!bucketName) {
      throw new Error('STORAGE_BUCKET_NAME is required');
    }

    this.bucketName = bucketName;
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.minioClient.send(
        new HeadBucketCommand({ Bucket: this.bucketName }),
      );
      this.logger.log(`Storage bucket is available: ${this.bucketName}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to initialize storage bucket "${this.bucketName}": ${this.describeS3Error(error)}`,
      );
      this.logger.warn(
        'Cloud object storage is not available. Backup/restore features will not work.',
      );
    }
  }

  async uploadFile(fileName: string, filePath: string): Promise<void> {
    try {
      const fileStats = fs.statSync(filePath);
      await this.minioClient.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: fs.createReadStream(filePath),
          ContentLength: fileStats.size,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to upload file "${fileName}" to storage: ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to upload file to storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async uploadBuffer(
    fileName: string,
    buffer: Buffer,
    contentType?: string,
  ): Promise<void> {
    try {
      await this.minioClient.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: buffer,
          ContentLength: buffer.length,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to upload buffer "${fileName}" to storage: ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to upload file to storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileStream(fileName: string) {
    try {
      const response = await this.minioClient.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );

      if (!response.Body) {
        throw new Error('Empty download response body');
      }

      return {
        body: this.toReadableStream(response.Body as S3Body),
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File ${fileName} not found in storage`);
      }
      this.logger.error(
        `Failed to stream file "${fileName}" from storage: ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to stream file from storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async downloadFile(
    fileName: string,
    destinationPath: string,
  ): Promise<void> {
    try {
      const response = await this.minioClient.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );

      if (!response.Body) {
        throw new Error('Empty download response body');
      }

      await pipeline(
        this.toReadableStream(response.Body as S3Body),
        fs.createWriteStream(destinationPath),
      );
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File ${fileName} not found in storage`);
      }
      this.logger.error(
        `Failed to download file "${fileName}" from storage: ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to download file from storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      await this.minioClient.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File ${fileName} not found in storage`);
      }
      this.logger.error(
        `Failed to delete file "${fileName}" from storage: ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to delete file from storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listFiles(): Promise<MinioFileDto[]> {
    try {
      const response = await this.minioClient.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
        }),
      );

      return (response.Contents ?? []).map((file) => ({
        fileName: file.Key ?? '',
        size: file.Size ?? 0,
        etag: (file.ETag ?? '').replaceAll('"', ''),
        lastModified: file.LastModified ?? new Date(0),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to list files from storage: ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to list files from storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileUrl(fileName: string, expiresIn = 3600) {
    try {
      return getSignedUrl(
        this.minioClient,
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
        { expiresIn },
      );
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File ${fileName} not found in storage`);
      }
      this.logger.error(
        `Failed to generate presigned URL for "${fileName}": ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to generate presigned URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileStat(fileName: string) {
    try {
      const response = await this.minioClient.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
        }),
      );

      return {
        size: response.ContentLength ?? 0,
        etag: (response.ETag ?? '').replaceAll('"', ''),
        lastModified: response.LastModified ?? new Date(0),
      };
    } catch (error: unknown) {
      if (this.isNotFoundError(error)) {
        throw new NotFoundException(`File ${fileName} not found in storage`);
      }
      this.logger.error(
        `Failed to get file stats for "${fileName}": ${this.describeS3Error(error)}`,
      );
      throw new HttpException(
        'Failed to get file stats from storage',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private toReadableStream(body: S3Body): Readable {
    if (body instanceof Readable) {
      return body;
    }

    if (body instanceof Blob) {
      return Readable.fromWeb(body.stream() as NodeReadableStream);
    }

    return Readable.fromWeb(body);
  }

  private isNotFoundError(error: unknown) {
    if (!(error instanceof S3ServiceException)) {
      return false;
    }

    return (
      error.name === 'NoSuchKey' ||
      error.name === 'NotFound' ||
      error.$metadata.httpStatusCode === 404
    );
  }

  private describeS3Error(error: unknown) {
    if (error instanceof S3ServiceException) {
      return [
        error.name,
        error.$metadata.httpStatusCode
          ? `status ${error.$metadata.httpStatusCode}`
          : undefined,
        error.message,
      ]
        .filter(Boolean)
        .join(' - ');
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

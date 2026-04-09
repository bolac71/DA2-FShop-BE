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
import * as Minio from 'minio';
import * as fs from 'fs';
import { MinioFileDto } from './dtos/minio-file.dto';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly bucketName: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(
    @Inject('MINIO_CLIENT')
    private readonly minioClient: Minio.Client,
    private readonly configService: ConfigService,
  ) {
    this.bucketName =
      this.configService.get<string>('MINIO_BUCKET_NAME') || 'fshop-backups';
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        this.logger.log(`Creating MinIO bucket: ${this.bucketName}`);
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`MinIO bucket created: ${this.bucketName}`);
      } else {
        this.logger.log(`MinIO bucket already exists: ${this.bucketName}`);
      }
    } catch (error: any) {
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
      const fileStats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      await this.minioClient.putObject(
        this.bucketName,
        fileName,
        fileStream,
        fileStats.size,
      );
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
      await this.minioClient.fGetObject(
        this.bucketName,
        fileName,
        destinationPath,
      );
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
      await this.minioClient.removeObject(this.bucketName, fileName);
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
      const objectsStream = this.minioClient.listObjects(
        this.bucketName,
        '',
        true,
      );

      const files: MinioFileDto[] = [];

      return new Promise((resolve, reject) => {
        objectsStream.on('data', (obj) => {
          if (obj.name && obj.size && obj.etag && obj.lastModified) {
            files.push({
              fileName: obj.name,
              size: obj.size,
              etag: obj.etag,
              lastModified: obj.lastModified,
            });
          }
        });

        objectsStream.on('end', () => {
          resolve(files);
        });

        objectsStream.on('error', () => {
          reject(
            new HttpException(
              'Failed to list files from MinIO',
              HttpStatus.INTERNAL_SERVER_ERROR,
            ),
          );
        });
      });
    } catch (error) {
      throw new HttpException(
        'Failed to list files from MinIO',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFileUrl(fileName: string, expiresIn = 3600) {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        fileName,
        expiresIn,
      );
      return url;
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

  async getFileStat(fileName: string): Promise<Minio.BucketItemStat> {
    try {
      const stat = await this.minioClient.statObject(
        this.bucketName,
        fileName,
      );
      return stat;
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

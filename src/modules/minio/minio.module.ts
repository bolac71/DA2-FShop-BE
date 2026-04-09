import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { MinioProvider } from './minio.provider';

@Module({
  providers: [MinioProvider, MinioService],
  exports: ['MINIO_CLIENT', MinioService],
})
export class MinioModule {}

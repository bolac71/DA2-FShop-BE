/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ConfigService } from '@nestjs/config';
import { SupabaseS3Client } from './supabase-s3.client';

export const MinioProvider = {
  provide: 'MINIO_CLIENT',
  useFactory: (configService: ConfigService) => {
    const endPoint = configService.get<string>('MINIO_ENDPOINT');
    const portValue = configService.get<string>('MINIO_PORT');
    const accessKey = configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = configService.get<string>('MINIO_SECRET_KEY');
    const useSslValue = configService.get<string>('MINIO_USE_SSL');

    if (!endPoint) {
      throw new Error('MINIO_ENDPOINT is required');
    }
    if (!portValue) {
      throw new Error('MINIO_PORT is required');
    }
    if (!accessKey) {
      throw new Error('MINIO_ACCESS_KEY is required');
    }
    if (!secretKey) {
      throw new Error('MINIO_SECRET_KEY is required');
    }

    const region = configService.get<string>('MINIO_REGION') ?? 'us-east-1';

    const client = new SupabaseS3Client({
      endpoint: endPoint,
      region,
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      portValue,
      useSslValue,
    });

    return client;
  },
  inject: [ConfigService],
};

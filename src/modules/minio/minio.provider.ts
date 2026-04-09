/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// minio.provider.ts

import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export const MinioProvider = {
  provide: 'MINIO_CLIENT',
  useFactory: (configService: ConfigService) => {
    const client = new Minio.Client({
      endPoint: configService.get<string>('MINIO_ENDPOINT') || 'localhost',
      port: configService.get<number>('MINIO_PORT') || 9000,
      useSSL: configService.get<boolean>('MINIO_USE_SSL') === true,
      accessKey: configService.get<string>('MINIO_ACCESS_KEY') || 'minioadmin',
      secretKey: configService.get<string>('MINIO_SECRET_KEY') || 'minioadmin',
    });

    return client;
  },
  inject: [ConfigService],
};

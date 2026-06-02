import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const MinioProvider = {
  provide: 'MINIO_CLIENT',
  useFactory: (configService: ConfigService) => {
    const endpoint = getStorageEndpoint(configService);
    const accessKey = getConfigValue(
      configService,
      'STORAGE_ACCESS_KEY_ID',
      'MINIO_ACCESS_KEY',
    );
    const secretKey = getConfigValue(
      configService,
      'STORAGE_SECRET_ACCESS_KEY',
      'MINIO_SECRET_KEY',
    );

    if (!endpoint) {
      throw new Error('STORAGE_ENDPOINT is required');
    }
    if (!accessKey) {
      throw new Error('STORAGE_ACCESS_KEY_ID is required');
    }
    if (!secretKey) {
      throw new Error('STORAGE_SECRET_ACCESS_KEY is required');
    }

    return new S3Client({
      endpoint,
      forcePathStyle: true,
      region:
        getConfigValue(configService, 'STORAGE_REGION', 'MINIO_REGION') ??
        'auto',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  },
  inject: [ConfigService],
};

function getConfigValue(
  configService: ConfigService,
  key: string,
  fallbackKey: string,
) {
  return configService.get<string>(key) ?? configService.get<string>(fallbackKey);
}

function getStorageEndpoint(configService: ConfigService) {
  const storageEndpoint = configService.get<string>('STORAGE_ENDPOINT');
  if (storageEndpoint) {
    return storageEndpoint;
  }

  const minioEndpoint = configService.get<string>('MINIO_ENDPOINT');
  if (!minioEndpoint) {
    return undefined;
  }

  if (/^https?:\/\//i.test(minioEndpoint)) {
    return minioEndpoint;
  }

  const useSslValue = configService.get<string>('MINIO_USE_SSL');
  const useSSL = useSslValue === 'true' || useSslValue === '1';
  const portValue = configService.get<string>('MINIO_PORT');
  const url = new URL(`${useSSL ? 'https' : 'http'}://${minioEndpoint}`);

  if (url.hostname.includes('storage.supabase.co')) {
    url.pathname = '/storage/v1/s3';
  } else if (portValue) {
    url.port = portValue;
  }

  return url.toString();
}

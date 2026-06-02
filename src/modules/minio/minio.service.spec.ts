import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { MinioService } from './minio.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('MinioService', () => {
  const bucketName = 'fshop-backups';
  let send: jest.Mock;
  let service: MinioService;

  beforeEach(() => {
    send = jest.fn();
    service = new MinioService(
      { send } as never,
      {
        get: jest.fn((key: string) => {
          const values: Record<string, string> = {
            STORAGE_BUCKET_NAME: bucketName,
          };
          return values[key];
        }),
      } as unknown as ConfigService,
    );
  });

  it('checks bucket availability on module init', async () => {
    send.mockResolvedValueOnce({});

    await service.onModuleInit();

    const command = send.mock.calls[0][0] as HeadBucketCommand;
    expect(command).toBeInstanceOf(HeadBucketCommand);
    expect(command.input).toEqual({ Bucket: bucketName });
  });

  it('uploads a backup file with PutObjectCommand', async () => {
    const tempFile = path.join(os.tmpdir(), `fshop-backup-${Date.now()}.sql`);
    fs.writeFileSync(tempFile, 'backup-data');
    send.mockResolvedValueOnce({});

    await service.uploadFile('backup.sql', tempFile);

    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: bucketName,
      Key: 'backup.sql',
      ContentLength: 11,
    });
    expect(command.input.Body).toBeInstanceOf(fs.ReadStream);
  });

  it('downloads a backup file with GetObjectCommand', async () => {
    const destination = path.join(os.tmpdir(), `fshop-restore-${Date.now()}.sql`);
    send.mockResolvedValueOnce({
      Body: Readable.from(['restore-data']),
    });

    await service.downloadFile('backup.sql', destination);

    const command = send.mock.calls[0][0] as GetObjectCommand;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({
      Bucket: bucketName,
      Key: 'backup.sql',
    });
    expect(fs.readFileSync(destination, 'utf8')).toBe('restore-data');

    fs.unlinkSync(destination);
  });

  it('lists backup files from ListObjectsV2Command', async () => {
    const lastModified = new Date('2026-06-02T00:00:00.000Z');
    send.mockResolvedValueOnce({
      Contents: [
        {
          Key: 'backup.sql',
          Size: 128,
          ETag: '"etag-value"',
          LastModified: lastModified,
        },
      ],
    });

    const files = await service.listFiles();

    const command = send.mock.calls[0][0] as ListObjectsV2Command;
    expect(command).toBeInstanceOf(ListObjectsV2Command);
    expect(command.input).toEqual({ Bucket: bucketName });
    expect(files).toEqual([
      {
        fileName: 'backup.sql',
        size: 128,
        etag: 'etag-value',
        lastModified,
      },
    ]);
  });

  it('deletes a backup file with DeleteObjectCommand', async () => {
    send.mockResolvedValueOnce({});

    await service.deleteFile('backup.sql');

    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: bucketName,
      Key: 'backup.sql',
    });
  });

  it('reads backup metadata with HeadObjectCommand', async () => {
    const lastModified = new Date('2026-06-02T00:00:00.000Z');
    send.mockResolvedValueOnce({
      ContentLength: 128,
      ETag: '"etag-value"',
      LastModified: lastModified,
    });

    const stat = await service.getFileStat('backup.sql');

    const command = send.mock.calls[0][0] as HeadObjectCommand;
    expect(command).toBeInstanceOf(HeadObjectCommand);
    expect(command.input).toEqual({
      Bucket: bucketName,
      Key: 'backup.sql',
    });
    expect(stat).toEqual({
      size: 128,
      etag: 'etag-value',
      lastModified,
    });
  });

  it('generates a presigned download URL', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValueOnce('https://signed.example');

    await expect(service.getFileUrl('backup.sql', 60)).resolves.toBe(
      'https://signed.example',
    );
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(GetObjectCommand),
      { expiresIn: 60 },
    );
  });
});

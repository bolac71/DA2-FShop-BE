/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { BackupMetadata } from './interfaces/backup-metadata.interface';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly tempDir: string;
  private readonly backupFileRegex = /^backup_\d{4}-\d{2}-\d{2}_\d{6}\.dump$/;

  constructor(
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDirExists();
  }

  private ensureTempDirExists(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private generateBackupFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `backup_${year}-${month}-${day}_${hours}${minutes}${seconds}.dump`;
  }

  private runCommand(command: string): void {
    execSync(command, { stdio: 'pipe' });
  }

  private ensureValidBackupFilename(filename: string): void {
    if (!this.backupFileRegex.test(filename)) {
      throw new HttpException('Invalid backup filename format', HttpStatus.BAD_REQUEST);
    }
  }

  async createBackup() {
    const filename = this.generateBackupFilename();
    const tempFilePath = path.join(this.tempDir, filename);

    const dbUsername = this.configService.get<string>('DB_USERNAME');
    const dbPassword = this.configService.get<string>('DB_PASSWORD');
    const dbName = this.configService.get<string>('DB_NAME');

    const containerName = 'fshop_postgres';
    const containerBackupPath = `/tmp/${filename}`;

    try {
      this.logger.log(`Starting database backup: ${filename}`);

      // Step 1: Create backup inside container
      const dumpCommand = `docker exec -e PGPASSWORD=${dbPassword} ${containerName} pg_dump -U ${dbUsername} -d ${dbName} -F c -f ${containerBackupPath}`;

      this.runCommand(dumpCommand);

      this.logger.log(`Database dumped inside container: ${containerBackupPath}`);

      // Step 2: Copy backup file from container to host
      const copyCommand = `docker cp ${containerName}:${containerBackupPath} "${tempFilePath}"`;

      this.runCommand(copyCommand);

      this.logger.log(`Backup copied to host: ${tempFilePath}`);

      // Step 3: Clean up backup file inside container
      const cleanupCommand = `docker exec ${containerName} rm ${containerBackupPath}`;

      try {
        this.runCommand(cleanupCommand);
      } catch {
        this.logger.warn('Failed to clean up backup file in container');
      }

      // Step 4: Upload to MinIO
      await this.minioService.uploadFile(filename, tempFilePath);

      this.logger.log(`Backup uploaded to MinIO: ${filename}`);

      // Get file stats
      const fileStats = fs.statSync(tempFilePath);

      // Clean up temp file on host
      fs.unlinkSync(tempFilePath);

      this.logger.log(`Temp file cleaned up: ${tempFilePath}`);

      return {
        filename,
        size: fileStats.size,
        createdAt: new Date(),
        status: 'success',
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Backup failed: ${error.message}`, error.stack);

      // Clean up temp file if exists
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      throw new HttpException(
        `Database backup failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async listBackups() {
    try {
      const files = await this.minioService.listFiles();

      const backups: BackupMetadata[] = files
        .filter((file) => file.fileName.startsWith('backup_'))
        .map((file) => ({
          filename: file.fileName,
          size: file.size,
          createdAt: file.lastModified,
          status: 'success' as const,
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return backups;
    } catch (error: any) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      throw new HttpException('Failed to list backups', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async restoreBackup(filename: string) {
    this.ensureValidBackupFilename(filename);

    const tempFilePath = path.join(this.tempDir, filename);

    const dbUsername = this.configService.get<string>('DB_USERNAME');
    const dbPassword = this.configService.get<string>('DB_PASSWORD');
    const dbName = this.configService.get<string>('DB_NAME');

    const containerName = 'fshop_postgres';
    const containerBackupPath = `/tmp/${filename}`;

    try {
      this.logger.log(`Starting database restore from: ${filename}`);

      // Step 1: Download backup file from MinIO
      await this.minioService.downloadFile(filename, tempFilePath);

      this.logger.log(`Backup downloaded to ${tempFilePath}`);

      // Step 2: Copy backup file to container
      const copyToContainerCommand = `docker cp "${tempFilePath}" ${containerName}:${containerBackupPath}`;

      this.runCommand(copyToContainerCommand);

      this.logger.log(`Backup copied to container: ${containerBackupPath}`);

      // Step 3: Terminate active connections
      const terminateConnectionsCommand = `docker exec -e PGPASSWORD=${dbPassword} ${containerName} psql -U ${dbUsername} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`;

      try {
        this.runCommand(terminateConnectionsCommand);
        this.logger.log('Active database connections terminated');
      } catch (error: any) {
        this.logger.warn(
          `Failed to terminate connections (this is OK if no active connections): ${error.message}`,
        );
      }

      // Step 4: Drop and recreate schema
      const dropSchemaCommand = `docker exec -e PGPASSWORD=${dbPassword} ${containerName} psql -U ${dbUsername} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;

      this.runCommand(dropSchemaCommand);

      this.logger.log('Schema dropped and recreated');

      // Step 5: Restore from backup
      const restoreCommand = `docker exec -e PGPASSWORD=${dbPassword} ${containerName} pg_restore -U ${dbUsername} -d ${dbName} -F c ${containerBackupPath}`;

      this.runCommand(restoreCommand);

      this.logger.log(`Database restored successfully from ${filename}`);

      // Step 6: Clean up backup file in container
      const cleanupCommand = `docker exec ${containerName} rm ${containerBackupPath}`;

      try {
        this.runCommand(cleanupCommand);
      } catch {
        this.logger.warn('Failed to clean up backup file in container');
      }

      // Clean up temp file on host
      fs.unlinkSync(tempFilePath);

      this.logger.log(`Temp file cleaned up: ${tempFilePath}`);
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Restore failed: ${error.message}`, error.stack);

      // Clean up temp file if exists
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      throw new HttpException(
        `Database restore failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteBackup(filename: string) {
    this.ensureValidBackupFilename(filename);

    try {
      this.logger.log(`Deleting backup: ${filename}`);

      await this.minioService.deleteFile(filename);

      this.logger.log(`Backup deleted successfully: ${filename}`);
    } catch (error: any) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        throw error;
      }

      this.logger.error(`Failed to delete backup: ${error.message}`);
      throw new HttpException('Failed to delete backup', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getBackupInfo(filename: string) {
    this.ensureValidBackupFilename(filename);

    try {
      const stat = await this.minioService.getFileStat(filename);
      const downloadUrl = await this.minioService.getFileUrl(filename, 3600);

      return {
        filename,
        size: stat.size,
        createdAt: stat.lastModified,
        status: 'success',
        downloadUrl,
      };
    } catch (error: any) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        throw error;
      }

      this.logger.error(`Failed to get backup info: ${error.message}`);
      throw new HttpException('Failed to get backup info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Scheduled automatic backup
  // Production: Every day at 2 AM
  // Demo mode (every 10 seconds): @Cron('*/10 * * * * *')
  @Cron('0 2 * * *')
  async handleScheduledBackup() {
    this.logger.log('Starting scheduled automatic backup...');

    try {
      const backup = await this.createBackup();
      this.logger.log(
        `Scheduled backup completed successfully: ${backup.filename} (${backup.size} bytes)`,
      );
    } catch (error: any) {
      this.logger.error(`Scheduled backup failed: ${error.message}`);
    }
  }
}

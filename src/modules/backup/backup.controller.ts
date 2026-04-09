import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { BackupResponseDto } from './dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants';

@ApiTags('Backup')
@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @ApiOperation({ summary: 'Create new database backup' })
  @ApiResponse({
    status: 201,
    description: 'Backup created successfully',
    type: BackupResponseDto,
  })
  async createBackup() {
    return this.backupService.createBackup();
  }

  @Get()
  @ApiOperation({ summary: 'List all backups' })
  @ApiResponse({
    status: 200,
    description: 'List of all backups',
    type: [BackupResponseDto],
  })
  async listBackups() {
    return this.backupService.listBackups();
  }

  @Post(':filename/restore')
  @ApiOperation({ summary: 'Restore database from backup' })
  @ApiResponse({
    status: 200,
    description: 'Database restored successfully',
  })
  async restoreBackup(@Param('filename') filename: string) {
    await this.backupService.restoreBackup(filename);
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete backup file' })
  @ApiResponse({
    status: 200,
    description: 'Backup deleted successfully',
  })
  async deleteBackup(@Param('filename') filename: string) {
    await this.backupService.deleteBackup(filename);
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Get backup details' })
  @ApiResponse({
    status: 200,
    description: 'Backup details',
    type: BackupResponseDto,
  })
  async getBackupInfo(
    @Param('filename') filename: string,
  ) {
    return this.backupService.getBackupInfo(filename);
  }
}

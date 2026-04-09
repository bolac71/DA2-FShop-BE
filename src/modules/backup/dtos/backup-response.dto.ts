import { ApiProperty } from '@nestjs/swagger';
import {
  NumberRequired,
  StringOptional,
  StringRequired,
} from 'src/decorators/dto.decorator';

export class BackupResponseDto {
  @StringRequired('filename')
  filename: string;

  @NumberRequired('size')
  size: number;

  @ApiProperty()
  createdAt: Date;

  @StringRequired('status')
  status: string;

  @StringOptional()
  downloadUrl?: string;
}

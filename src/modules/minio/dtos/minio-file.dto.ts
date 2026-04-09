import { ApiProperty } from '@nestjs/swagger';
import { NumberRequired, StringOptional, StringRequired } from 'src/decorators/dto.decorator';

export class MinioFileDto {
  @StringRequired('File Name')  
  fileName: string;

  @NumberRequired('File Size', 0)
  size: number;

  @StringRequired('ETag')
  etag: string;

  @ApiProperty({ required: true, example: '2024-06-01T12:00:00Z', description: 'File last modified date (ISO 8601 format)' })
  lastModified: Date;

  @StringOptional()
  url?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-06-01' })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-06-07' })
  endDate?: string;
}

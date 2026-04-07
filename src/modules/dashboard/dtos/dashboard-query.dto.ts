import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum DashboardTimeRange {
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  QUARTER = 'quarter',
}

export class DashboardQueryDto {
  @IsOptional()
  @IsEnum(DashboardTimeRange)
  @ApiPropertyOptional({ enum: DashboardTimeRange, default: DashboardTimeRange.SEVEN_DAYS })
  timeRange?: DashboardTimeRange;
}

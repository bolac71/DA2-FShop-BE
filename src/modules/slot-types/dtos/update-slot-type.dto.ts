import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSlotTypeDto {
  @ApiPropertyOptional({ example: 'Áo' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'top' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Áo thun, sơ mi, áo khoác' })
  @IsOptional()
  @IsString()
  hint?: string;
}

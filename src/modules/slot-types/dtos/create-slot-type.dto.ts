import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSlotTypeDto {
  @ApiProperty({ example: 'Áo' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'top' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ example: 'Áo thun, sơ mi, áo khoác' })
  @IsOptional()
  @IsString()
  hint?: string;
}

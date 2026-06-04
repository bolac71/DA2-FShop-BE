import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OutfitSlot } from '../entities';

export class OutfitItemLayoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  scale?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  zIndex?: number;
}

export class OutfitItemDto {
  @ApiProperty({ example: 'top' })
  @IsString()
  slot: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ type: OutfitItemLayoutDto })
  @IsOptional()
  @IsObject()
  layout?: OutfitItemLayoutDto;
}

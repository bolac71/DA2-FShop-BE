import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, ValidateNested, Min } from 'class-validator';
import { NumberOptional, StringOptional } from 'src/decorators/dto.decorator';
import { UpdateProductDto } from './update-product.dto';

const parseJsonIfNeeded = <T>(value: unknown): T | unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
};

export class UpsertProductVariantDto {
  @NumberOptional()
  @ApiProperty({ required: false, example: 10, description: 'Variant ID for update. Omit when creating a new variant' })
  id?: number;

  @StringOptional()
  @ApiProperty({ required: false, example: 'SKU-NEW-01' })
  sku?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1, description: 'Color ID' })
  colorId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1, description: 'Size ID' })
  sizeId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @ApiProperty({ required: false, example: 0, description: 'Index in variantImages multipart files array' })
  imageFileIndex?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @ApiProperty({ required: false, example: false, description: 'Set true to remove current image when no replacement is uploaded' })
  removeImage?: boolean;
}

export class UpdateProductFullDto extends UpdateProductDto {
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseJsonIfNeeded<number[]>(value))
  @Type(() => Number)
  @ApiProperty({ required: false, type: [Number], description: 'IDs of product gallery images to keep' })
  keepImageIds?: number[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseJsonIfNeeded<number[]>(value))
  @Type(() => Number)
  @ApiProperty({ required: false, type: [Number], description: 'Variant IDs to soft delete' })
  removeVariantIds?: number[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => parseJsonIfNeeded<UpsertProductVariantDto[]>(value))
  @ValidateNested({ each: true })
  @Type(() => UpsertProductVariantDto)
  @ApiProperty({ required: false, type: [UpsertProductVariantDto], description: 'Variants to create or update' })
  variants?: UpsertProductVariantDto[];

  @IsOptional()
  @ApiProperty({
    description: 'New product gallery images',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  productImages?: Express.Multer.File[];

  @IsOptional()
  @ApiProperty({
    description: 'New variant images used by variants.imageFileIndex',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  variantImages?: Express.Multer.File[];
}
import { IsOptional, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NumberRequired, StringOptional, StringRequired } from 'src/decorators/dto.decorator';

export class CreateProductImageDto {
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  file?: any; // Multer.File will be injected by controller
}

export class CreateProductVariantDto {
  @StringOptional()
  @ApiProperty({ example: 'SKU-12345', required: false })
  sku?: string;

  @NumberRequired('Color ID')
  @ApiProperty({ example: 1, description: 'Color ID' })
  colorId: number;

  @NumberRequired('Size ID')
  @ApiProperty({ example: 1, description: 'Size ID' })
  sizeId: number;
}

export class CreateProductDto {
  @StringRequired('Product name')
  @ApiProperty({ example: 'T-Shirt Premium' })
  name: string;

  @StringOptional()
  @ApiProperty({ example: 'High quality t-shirt', required: false })
  description?: string;

  @NumberRequired('Brand ID')
  @ApiProperty({ example: 1, description: 'Brand ID' })
  brandId: number;

  @NumberRequired('Category ID')
  @ApiProperty({ example: 1, description: 'Category ID' })
  categoryId: number;

  @NumberRequired('Price')
  @ApiProperty({ example: 99.99, description: 'Product price' })
  price: number;

  @IsOptional()
  @ApiProperty({
    description: 'Product gallery images (upload multiple files)',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  productImages?: Express.Multer.File[];

  @IsOptional()
  @ApiProperty({
    description: 'Variant images (upload images for each variant, order matters)',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  variantImages?: Express.Multer.File[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as CreateProductVariantDto[];
      } catch {
        return value as unknown;
      }
    }
    return value as unknown;
  })
  @Type(() => CreateProductVariantDto)
  @ApiProperty({ 
    type: [CreateProductVariantDto], 
    required: false, 
    description: 'Product variants (color, size combinations)' 
  })
  variants?: CreateProductVariantDto[];
}

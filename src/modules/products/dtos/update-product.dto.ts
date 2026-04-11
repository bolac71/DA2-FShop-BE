import { ApiProperty } from '@nestjs/swagger';
import { BooleanOptional, NumberOptional, StringOptional } from 'src/decorators/dto.decorator';
import { Min } from 'class-validator';

export class UpdateProductDto {
  @StringOptional()
  @ApiProperty({ required: false, example: 'T-Shirt Premium' })
  name?: string;

  @StringOptional()
  @ApiProperty({ required: false, example: 'High quality t-shirt' })
  description?: string;

  @NumberOptional()
  @ApiProperty({ required: false, example: 1, description: 'Brand ID' })
  brandId?: number;

  @NumberOptional()
  @ApiProperty({ required: false, example: 1, description: 'Category ID' })
  categoryId?: number;

  @NumberOptional()
  @Min(0)
  @ApiProperty({ required: false, example: 99.99, description: 'Product price' })
  price?: number;

  @BooleanOptional()
  @ApiProperty({ required: false, example: true })
  isActive?: boolean;
}

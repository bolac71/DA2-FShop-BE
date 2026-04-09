import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { StringRequired, StringOptional } from 'src/decorators/dto.decorator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Gucci' })
  @StringRequired('Brand name')
  name: string;

  @ApiProperty({ example: 'Italian best seller' })
  @StringOptional()
  description?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Brand image',
    required: false,
  })
  image?: string;
}

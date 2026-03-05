import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { StringOptional } from 'src/decorators/dto.decorator';

export class UpdateBrandDto {
  @ApiProperty({ example: 'Gucci' })
  @StringOptional()
  name?: string;
  
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

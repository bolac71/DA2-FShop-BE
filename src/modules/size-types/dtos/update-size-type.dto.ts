import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { StringOptional } from 'src/decorators/dto.decorator';

export class UpdateSizeTypeDto {
  @StringOptional()
  @ApiProperty({ example: 'Clothing', description: 'Name of the size type', required: false })
  name?: string;

  @StringOptional()
  @ApiProperty({ example: 'Sizes for clothing items', description: 'Description of the size type', required: false })
  description?: string;
}

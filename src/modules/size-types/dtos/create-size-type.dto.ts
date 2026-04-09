import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { StringOptional, StringRequired } from 'src/decorators/dto.decorator';

export class CreateSizeTypeDto {
  @StringRequired('Size type name')
  @ApiProperty({ example: 'Clothing', description: 'Name of the size type' })
  name: string;

  @StringOptional()
  @ApiProperty({ example: 'Sizes for clothing items', description: 'Description of the size type', required: false })
  description?: string;
}

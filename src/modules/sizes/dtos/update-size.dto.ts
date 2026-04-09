import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { StringRequired, NumberOptional, StringOptional } from 'src/decorators/dto.decorator';

export class UpdateSizeDto {
  @StringOptional()
  @ApiProperty({ example: 'M' })
  name: string;

  @NumberOptional()
  @ApiProperty({ example: 1, description: 'Size type ID' })
  sizeTypeId: number;

  @NumberOptional()
  @ApiProperty({ example: 0, required: false })
  sortOrder?: number;
}

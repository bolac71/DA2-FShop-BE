import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { NumberOptional, NumberRequired, StringRequired } from 'src/decorators/dto.decorator';

export class CreateSizeDto {
  @StringRequired('Size name')
  @ApiProperty({ example: 'M' })
  name: string;

  @NumberRequired('Size type ID')
  @ApiProperty({ example: 1, description: 'Size type ID' })
  sizeTypeId: number;

  @NumberOptional()
  @ApiProperty({ example: 0, required: false })
  sortOrder?: number;
}

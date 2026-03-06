import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { StringRequired, StringOptional } from 'src/decorators/dto.decorator';

export class CreateColorDto {
  @StringRequired('Color name')
  @ApiProperty({ example: 'Red' })
  name: string;

  @IsOptional()
  @IsString()
  @StringOptional()
  @ApiProperty({ example: '#FF0000', required: false })
  hexCode?: string;
}

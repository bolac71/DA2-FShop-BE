import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { StringOptional } from 'src/decorators/dto.decorator';

export class UpdateColorDto {
  @IsOptional()
  @IsString()
  @StringOptional()
  @ApiProperty({ example: 'Red', required: false })
  name?: string;

  @IsOptional()
  @IsString()
  @StringOptional()
  @ApiProperty({ example: '#FF0000', required: false })
  hexCode?: string;
}

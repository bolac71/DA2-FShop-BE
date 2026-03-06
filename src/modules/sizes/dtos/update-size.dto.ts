import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { SizeType } from 'src/constants/size-type.enum';
import { StringOptional } from 'src/decorators/dto.decorator';

export class UpdateSizeDto {
  @IsOptional()
  @IsString()
  @StringOptional()
  @ApiProperty({ example: 'M', required: false })
  name?: string;

  @IsOptional()
  @IsEnum(SizeType)
  @ApiProperty({ enum: SizeType, required: false })
  type?: SizeType;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 0, required: false })
  sortOrder?: number;
}

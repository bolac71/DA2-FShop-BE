import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { SizeType } from 'src/constants/size-type.enum';
import { StringRequired, StringOptional } from 'src/decorators/dto.decorator';

export class CreateSizeDto {
  @StringRequired('Size name')
  @ApiProperty({ example: 'M' })
  name: string;

  @IsOptional()
  @IsEnum(SizeType)
  @ApiProperty({ enum: SizeType, default: SizeType.CLOTHING, example: SizeType.CLOTHING, required: false })
  type?: SizeType;

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 0, required: false })
  sortOrder?: number;
}

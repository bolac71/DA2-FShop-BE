import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DepartmentType } from 'src/constants/department-type.enum';
import { StringOptional } from 'src/decorators/dto.decorator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @StringOptional()
  @ApiProperty({ example: 'T-Shirt', required: false })
  name?: string;

  @IsOptional()
  @IsEnum(DepartmentType)
  @ApiProperty({ enum: DepartmentType, required: false })
  department?: DepartmentType;

  @IsOptional()
  @IsString()
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Category image',
    required: false,
  })
  image?: string;

  @IsOptional()
  @IsString()
  @StringOptional()
  @ApiProperty({ required: false, example: 'This is a category for T-Shirts' })
  description?: string;

  @IsOptional()
  @Transform(({ value }) => value ? Number(value) : undefined)
  @ApiProperty({ required: false, example: 1 })
  slotTypeId?: number;
}

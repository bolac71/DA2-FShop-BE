import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DepartmentType } from 'src/constants/department-type.enum';
import { StringRequired, StringOptional } from 'src/decorators/dto.decorator';

export class CreateCategoryDto {
  @StringRequired('Category name')
  @ApiProperty({ example: 'T-Shirt' })
  name: string;

  @IsNotEmpty({ message: 'Department is required' })
  @IsEnum(DepartmentType, { message: 'Department must be one of: men, women, kids' })
  @ApiProperty({ enum: DepartmentType, example: DepartmentType.MEN })
  department: DepartmentType;

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
}

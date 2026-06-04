import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DepartmentType } from 'src/constants/department-type.enum';
import { QueryDto } from 'src/dtos/query.dto';

export class ProductQueryDto extends QueryDto {
  @IsOptional()
  @IsEnum(DepartmentType)
  @ApiPropertyOptional({ enum: DepartmentType })
  department?: DepartmentType;
}

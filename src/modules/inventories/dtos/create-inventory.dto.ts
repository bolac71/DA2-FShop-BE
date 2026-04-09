import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { NumberRequired } from 'src/decorators/dto.decorator';

export class CreateInventoryDto {
  @NumberRequired('Variant ID')
  @Min(1)
  variantId: number;

  @ApiProperty({ example: 100, default: 0 })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  @IsOptional()
  quantity: number = 0;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { InventoryType } from '../../../constants/inventory-type.enum';
import {NumberRequired, StringOptional } from 'src/decorators/dto.decorator';

export class CreateInventoryTransactionDto {
  @NumberRequired('Variant ID')
  @Min(1)
  variantId: number;

  @ApiProperty({
    enum: InventoryType,
    description: 'Type of inventory transaction',
  })
  @IsEnum(InventoryType, { message: 'Invalid inventory type' })
  type: InventoryType;

  @ApiProperty({ example: 10, description: 'Quantity to add/remove (can be negative for EXPORT)' })
  @IsInt({ message: 'Quantity must be an integer' })
  quantity: number;

  @StringOptional()
  note?: string;
}

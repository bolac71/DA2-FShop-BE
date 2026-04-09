import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BestCouponItemDto {
  @ApiProperty({ example: 1, description: 'Product variant ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty({ example: 5, description: 'Quantity to buy for this variant' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class GetBestPublicCouponDto {
  @ApiProperty({
    type: [BestCouponItemDto],
    description: 'List of variants and quantities from frontend cart/checkout',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BestCouponItemDto)
  items: BestCouponItemDto[];
}

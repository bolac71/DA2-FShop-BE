import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDecimal, Min, Max, IsOptional } from "class-validator";
import { IntegerRequired, NumberRequired, StringOptional } from "src/decorators/dto.decorator";

export class CreateReviewImageDto {
  @IsOptional()
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  file?: any; 
}

export class CreateReviewDto {
  @IntegerRequired('Variant ID')
  variantId: number

  @IntegerRequired('Order ID')
  orderId: number

  @NumberRequired('Rating', 0.5, 5)
  rating: number;

  @StringOptional()
  comment?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Review images (upload multiple files)',
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  reviewImages?: Express.Multer.File[];
}
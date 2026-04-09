import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { NumberOptional, StringOptional } from "src/decorators/dto.decorator";

export class UpdateReviewDto {
  @IsOptional()
  @ApiProperty({ required: false, example: 4.5, description: 'Rating value between 0.5 and 5' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Type(() => Number)
  @Min(0.5)
  @Max(5)
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
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ImageSearchDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  topK?: number = 12;
}

export class ImageSearchResultDto {
  product_id: number;
  score: number;
  image_url?: string;
}

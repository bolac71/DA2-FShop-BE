import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class AddLivestreamProductsBatchDto {
  @IsArray()
  @IsInt({ each: true })
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  productIds: number[];
}

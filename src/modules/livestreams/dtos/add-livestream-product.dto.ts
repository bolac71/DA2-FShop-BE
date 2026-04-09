import { NumberRequired } from 'src/decorators/dto.decorator';

export class AddLivestreamProductDto {
  @NumberRequired('Product Id', 1)
  productId: number;

  @NumberRequired('Position', 0)
  position: number;
}

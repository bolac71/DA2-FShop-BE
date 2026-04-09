import { NumberRequired } from "src/decorators/dto.decorator";

export class CreateWishlistsDto {
  @NumberRequired('Product ID')
  productId: number;
}
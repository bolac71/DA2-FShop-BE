import { IsInt, IsNotEmpty } from "class-validator";
import { IntegerRequired, NumberOptional } from "src/decorators/dto.decorator";

export class CartItemDto {
  @IntegerRequired('Quantity')
  quantity: number;

  @IntegerRequired('Variant ID')
  variantId: number;

  @NumberOptional()
  livestreamId?: number;
}
import { NumberRequired } from "src/decorators/dto.decorator";

export class CreateOrderItemDto {
  @NumberRequired('Variant ID')
  variantId: number

  @NumberRequired('quantity')
  quantity: number
}
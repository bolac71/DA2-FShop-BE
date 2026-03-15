import { NumberOptional, NumberRequired, StringOptional, StringRequired } from "src/decorators/dto.decorator";
import { CreateOrderItemDto } from "./create-order-item.dto";
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ShippingMethod } from "src/constants/shipping-method.enum";
import { ApiProperty } from "@nestjs/swagger";

export class CreateOrderDto {
  @NumberRequired('Address Id')
  addressId: number

  @NumberOptional()
  couponId?: number

  @StringOptional()
  note?: string

  @ApiProperty({ enum: ShippingMethod })
  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;

  @IsArray()
  @ArrayNotEmpty()
  @ApiProperty({ type: [CreateOrderItemDto] })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]
}
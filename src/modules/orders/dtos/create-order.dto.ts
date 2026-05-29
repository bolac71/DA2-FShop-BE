import {
  NumberOptional,
  NumberRequired,
  StringOptional,
  StringRequired,
} from 'src/decorators/dto.decorator';
import { CreateOrderItemDto } from './create-order-item.dto';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShippingMethod } from 'src/constants/shipping-method.enum';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from 'src/constants/payment-method.enum';

export class CreateOrderDto {
  @NumberRequired('Address Id')
  addressId: number;

  @NumberOptional()
  livestreamId?: number;

  @NumberOptional()
  couponId?: number;

  @StringOptional()
  note?: string;

  @ApiProperty({ enum: ShippingMethod })
  @IsEnum(ShippingMethod)
  shippingMethod: ShippingMethod;

  @IsOptional()
  @ApiProperty({ enum: PaymentMethod, required: false })
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @StringOptional()
  shippingRateId?: string;

  @StringOptional()
  shippingCarrierName?: string;

  @StringOptional()
  shippingServiceName?: string;

  @StringOptional()
  shippingExpected?: string;

  @NumberOptional()
  shippingRateFee?: number;

  @StringOptional()
  shippingTrackingUrl?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ApiProperty({ type: [CreateOrderItemDto] })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

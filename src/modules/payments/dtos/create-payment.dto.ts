import { IsEnum } from 'class-validator';
import { PaymentMethod } from 'src/constants/payment-method.enum';
import { NumberRequired } from 'src/decorators/dto.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentRequestDto {
  @NumberRequired('Order ID')
  orderId: number;

  @ApiProperty({
    enum: PaymentMethod,
    required: true,
    description: 'Payment method: momo or cod',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

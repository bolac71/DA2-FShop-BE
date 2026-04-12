import { PaymentMethod } from 'src/constants/payment-method.enum';
import { PaymentStatus } from 'src/constants/payment-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID', example: 1 })
  paymentId: number;

  @ApiProperty({ description: 'Order ID', example: 1 })
  orderId: number;

  @ApiProperty({
    enum: PaymentStatus,
    description: 'Current payment status',
    example: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method used',
    example: PaymentMethod.MOMO,
  })
  method: PaymentMethod;

  @ApiProperty({ description: 'Payment amount in VND', example: 50000 })
  amount: number;

  @ApiProperty({
    nullable: true,
    description: 'External transaction ID from payment gateway',
    example: 'MOMO_TXN_123456',
  })
  externalTransactionId: string;

  @ApiProperty({
    nullable: true,
    description: 'Redirect URL to complete payment (for web checkout)',
    example: 'https://test-payment.momo.vn/v3/gateway/api/create?...',
  })
  redirectUrl: string;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2026-04-09T21:03:08.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Payment last update timestamp',
    example: '2026-04-09T21:03:08.000Z',
  })
  updatedAt: Date;
}

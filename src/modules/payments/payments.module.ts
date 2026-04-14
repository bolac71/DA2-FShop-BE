import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentRetry, Order } from 'src/entities';
import { MoMoGateway } from 'src/utils/momo-gateway.util';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Payment, PaymentRetry, Order]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MoMoGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}

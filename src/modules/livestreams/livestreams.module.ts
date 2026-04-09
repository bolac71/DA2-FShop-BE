import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Livestream,
  LivestreamComment,
  LivestreamOrder,
  LivestreamProduct,
} from './entities';
import { LivestreamsService } from './livestreams.service';
import { LivestreamsController } from './livestreams.controller';
import { LivestreamsGateway } from './livestreams.gateway';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Livestream,
      LivestreamComment,
      LivestreamProduct,
      LivestreamOrder,
      Product,
      Order,
    ]),
    AuthModule,
    NotificationsModule,
    CloudinaryModule,
  ],
  controllers: [LivestreamsController],
  providers: [LivestreamsService, LivestreamsGateway],
  exports: [LivestreamsService],
})
export class LivestreamsModule {}

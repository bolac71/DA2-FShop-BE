import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Livestream,
  LivestreamComment,
  LivestreamOrder,
  LivestreamProduct,
} from './entities';
import { LivestreamPoll } from './entities/livestream-poll.entity';
import { LivestreamPollVote } from './entities/livestream-poll-vote.entity';
import { LivestreamsService } from './livestreams.service';
import { LivestreamsController } from './livestreams.controller';
import { LivestreamsGateway } from './livestreams.gateway';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities';
import { User } from '../users/entities/user.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Livestream,
      LivestreamComment,
      LivestreamProduct,
      LivestreamOrder,
      LivestreamPoll,
      LivestreamPollVote,
      Product,
      Order,
      User,
    ]),
    AuthModule,
    NotificationsModule,
    CloudinaryModule,
    ModerationModule,
  ],
  controllers: [LivestreamsController],
  providers: [LivestreamsService, LivestreamsGateway],
  exports: [LivestreamsService],
})
export class LivestreamsModule {}

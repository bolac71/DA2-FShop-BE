import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { NotificationGateway } from './notifications.gateway';
import { User } from 'src/entities';
import { getJwtConfig } from 'src/configs/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, User, DeviceToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getJwtConfig,
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationGateway],
  exports: [NotificationsService, NotificationGateway],
})
export class NotificationsModule {}

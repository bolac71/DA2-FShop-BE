import { MiddlewareConsumer, Module, NestModule, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './configs/database.config';
import { UsersModule } from './modules/users/users.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AllExceptionFilter } from './filters/all-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { StartTimingMiddleware } from './middlewares/start-timing.middleware';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { getRedisConfig } from './configs/redis.config';
import { ColorsModule } from './modules/colors/colors.module';
import { SizeTypesModule } from './modules/size-types/size-types.module';
import { SizesModule } from './modules/sizes/sizes.module';
import { ProductsModule } from './modules/products/products.module';
import { AuthModule } from './modules/auth/auth.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { WishlistsModule } from './modules/wishlists/wishlists.module';
import { CartsModule } from './modules/carts/carts.module';
import { InventoriesModule } from './modules/inventories/inventories.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PostsModule } from './modules/posts/posts.module';
import { MinioModule } from './modules/minio/minio.module';
import { BackupModule } from './modules/backup/backup.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatsModule } from './modules/chats/chats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getRedisConfig,
    }),
    UsersModule,
    BrandsModule,
    CategoriesModule,
    CloudinaryModule,
    ColorsModule,
    SizeTypesModule,
    SizesModule,
    ProductsModule,
    AuthModule,
    AddressesModule,
    WishlistsModule,
    CartsModule,
    InventoriesModule,
    OrdersModule,
    CouponsModule,
    ReviewsModule,
    PostsModule,
    MinioModule,
    BackupModule,
    NotificationsModule,
    ChatsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // xet global Interceptor
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
    // xet global Exception
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(StartTimingMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}

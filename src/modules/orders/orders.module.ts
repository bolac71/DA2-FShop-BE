import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem } from './entities';
import { CartItem, Coupon, CouponRedemption, Inventory, InventoryTransaction, ProductVariant, User } from 'src/entities';
import { InventoriesModule } from '../inventories/inventories.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      User,
      ProductVariant,
      Inventory,
      InventoryTransaction,
      CartItem,
      Coupon,
      CouponRedemption,
    ]),
    InventoriesModule,
    NotificationsModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule { }

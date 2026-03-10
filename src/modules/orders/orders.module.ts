import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem } from './entities';
import { CartItem, Inventory, InventoryTransaction, ProductVariant, User } from 'src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, User, ProductVariant, Inventory, InventoryTransaction, CartItem])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

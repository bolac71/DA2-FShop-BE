import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { Type } from 'class-transformer';
import { Inventory, InventoryTransaction, ProductVariant, User } from 'src/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart, CartItem } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, ProductVariant, User, Inventory, InventoryTransaction])],
  controllers: [CartsController],
  providers: [CartsService],
  exports: [CartsService],
})
export class CartsModule {}

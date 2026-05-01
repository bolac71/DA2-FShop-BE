import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Coupon } from '../coupons/entities';
import { InventoryTransaction } from '../inventories/entities/inventory-transaction.entity';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItem, Product, ProductVariant, InventoryTransaction, Coupon]),
    ProductsModule,
    CouponsModule,
  ],
  providers: [RecommendationsService],
  controllers: [RecommendationsController],
})
export class RecommendationsModule { }

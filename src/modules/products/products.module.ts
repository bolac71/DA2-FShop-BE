import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, ProductImage, ProductVariant } from 'src/entities';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../categories/categories.module';
import { ColorsModule } from '../colors/colors.module';
import { SizesModule } from '../sizes/sizes.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { CartItem } from '../carts/entities';
import { InventoryTransaction } from '../inventories/entities/inventory-transaction.entity';
import { Inventory } from '../inventories/entities/inventory.entity';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductVariant, InventoryTransaction, Inventory]),
    BrandsModule,
    CategoriesModule,
    ColorsModule,
    SizesModule,
    CloudinaryModule,
    CartItem,
    CouponsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

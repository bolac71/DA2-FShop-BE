import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Cart,
  Inventory,
  Outfit,
  OutfitItem,
  Product,
  ProductVariant,
  User,
} from 'src/entities';
import { CartsModule } from '../carts/carts.module';
import { OutfitsController } from './outfits.controller';
import { OutfitsService } from './outfits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Outfit,
      OutfitItem,
      User,
      Product,
      ProductVariant,
      Inventory,
      Cart,
    ]),
    CartsModule,
  ],
  controllers: [OutfitsController],
  providers: [OutfitsService],
})
export class OutfitsModule {}

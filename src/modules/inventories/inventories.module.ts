import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoriesService } from './inventories.service';
import { InventoriesController } from './inventories.controller';
import { Inventory, InventoryTransaction } from './entities';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { User } from 'src/entities';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Inventory, InventoryTransaction, ProductVariant, User]),
    SettingsModule,
  ],
  controllers: [InventoriesController],
  providers: [InventoriesService],
  exports: [InventoriesService],
})
export class InventoriesModule {}

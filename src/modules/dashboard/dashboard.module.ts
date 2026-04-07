import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory, Order, Product, User } from 'src/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, User, Inventory, Product])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

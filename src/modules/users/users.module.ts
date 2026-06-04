import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Address } from '../addresses/entities/address.entity';
import { Cart } from '../carts/entities';
import { CartsModule } from '../carts/carts.module';

import { UserFollow } from './entities/user-follow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Address, Cart, UserFollow]), CloudinaryModule, CartsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

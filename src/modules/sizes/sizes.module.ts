import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Size } from './entities/size.entity';
import { SizesService } from './sizes.service';
import { SizesController } from './sizes.controller';
import { SizeTypesModule } from '../size-types/size-types.module';

@Module({
  imports: [TypeOrmModule.forFeature([Size]), SizeTypesModule],
  controllers: [SizesController],
  providers: [SizesService],
  exports: [SizesService],
})
export class SizesModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SizeType } from './entities/size-type.entity';
import { SizeTypesService } from './size-types.service';
import { SizeTypesController } from './size-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SizeType])],
  controllers: [SizeTypesController],
  providers: [SizeTypesService],
  exports: [SizeTypesService],
})
export class SizeTypesModule {}

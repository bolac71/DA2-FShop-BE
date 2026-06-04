import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlotType } from './entities/slot-type.entity';
import { SlotTypesController } from './slot-types.controller';
import { SlotTypesService } from './slot-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([SlotType])],
  controllers: [SlotTypesController],
  providers: [SlotTypesService],
  exports: [SlotTypesService, TypeOrmModule],
})
export class SlotTypesModule {}

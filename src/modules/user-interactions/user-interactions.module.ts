import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInteraction } from './entities/user-interaction.entity';
import { UserInteractionsService } from './user-interactions.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserInteraction])],
  providers: [UserInteractionsService],
  exports: [UserInteractionsService],
})
export class UserInteractionsModule {}

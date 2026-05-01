import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review, ReviewImage, ReviewVote } from './entities';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Order, Product, ProductVariant, User } from 'src/entities';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, ReviewImage, ReviewVote, User, Product, ProductVariant, Order]),
    CloudinaryModule,
    ModerationModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}

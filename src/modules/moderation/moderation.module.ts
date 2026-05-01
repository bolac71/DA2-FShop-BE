import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationLog } from './entities/moderation-log.entity';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { Review } from '../reviews/entities/review.entity';
import { PostComment } from '../posts/entities/post-comment.entity';
import { LivestreamComment } from '../livestreams/entities/livestream-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModerationLog, Review, PostComment, LivestreamComment])],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}

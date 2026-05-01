import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post, PostComment, PostImage, PostLike } from './entities';
import { Hashtag, PostHashtag } from './entities';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostImage,
      PostLike,
      PostComment,
      Hashtag,
      PostHashtag,
    ]),
    CloudinaryModule,
    ModerationModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}

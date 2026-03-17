import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post, PostComment, PostImage, PostLike } from './entities';
import { Hashtag, PostHashtag } from './entities';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

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
    CloudinaryModule
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}

import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Hashtag, PostComment, PostHashtag, PostImage, PostLike, Post } from './entities';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreatePostDto } from './dtos';
import { User } from 'src/entities';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postRepository: Repository<Post>,
    @InjectRepository(PostImage) private postImageRepository: Repository<PostImage>,
    @InjectRepository(PostLike) private postLikeRepository: Repository<PostLike>,
    @InjectRepository(PostComment) private postCommentRepository: Repository<PostComment>,
    @InjectRepository(Hashtag) private hashtagRepository: Repository<Hashtag>,
    @InjectRepository(PostHashtag) private postHashtagRepository: Repository<PostHashtag>,
    private dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(userId: number, createPostDto: CreatePostDto, images: Array<Express.Multer.File>) {
    const content = createPostDto.content?.trim();
    const normalizedHashtags = Array.from(
      new Set((createPostDto.hashtags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
    );

    if (!content && images.length === 0) {
      throw new HttpException('Post must have content or at least one image', HttpStatus.BAD_REQUEST);
    }

    const uploaded = images.length
      ? await Promise.all(images.map((image) => this.cloudinaryService.uploadFile(image)))
      : [];

    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user) {
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const post = manager.create(Post, {
          user,
          content,
          totalLikes: 0,
          totalComments: 0,
          isActive: true,
        });
        const savedPost = await manager.save(post);

        if (uploaded.length > 0) {
          const imageEntities = uploaded.map((upload) =>
            manager.create(PostImage, {
              post: savedPost,
              imageUrl: upload?.secure_url,
              publicId: upload?.public_id,
            }),
          );
          await manager.save(imageEntities);
          savedPost.images = imageEntities;
        }

        if (normalizedHashtags.length > 0) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(Hashtag)
            .values(normalizedHashtags.map((name) => ({ name, postCount: 0 })))
            .orIgnore()
            .execute();

          const hashtagEntities = await manager.find(Hashtag, {
            where: {
              name: In(normalizedHashtags),
            },
          });

          const postHashtagEntities = hashtagEntities.map((hashtag) =>
            manager.create(PostHashtag, {
              post: savedPost,
              hashtag,
            }),
          );

          await manager.save(postHashtagEntities);
          savedPost.postHashtags = postHashtagEntities;

          await manager.increment(
            Hashtag,
            {
              id: In(hashtagEntities.map((hashtag) => hashtag.id)),
            },
            'postCount',
            1,
          );
        }

        return plainToInstance(Post, savedPost);
      });
    } catch (error) {
      if (uploaded.length > 0) {
        const publicIds: string[] = [];

        for (const upload of uploaded) {
          if (upload && typeof upload === 'object' && 'public_id' in upload) {
            const publicId = upload.public_id;
            if (typeof publicId === 'string' && publicId.length > 0) {
              publicIds.push(publicId);
            }
          }
        }

        await Promise.allSettled(
          publicIds.map((publicId) => this.cloudinaryService.deleteFile(publicId)),
        );
      }

      throw error;
    }
  }
}

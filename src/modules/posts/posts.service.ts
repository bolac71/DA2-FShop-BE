import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { Hashtag, PostComment, PostHashtag, PostImage, PostLike, Post } from './entities';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreatePostDto } from './dtos';
import { User } from 'src/entities';
import { plainToInstance } from 'class-transformer';
import { QueryDto } from 'src/dtos';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private postImageRepository: Repository<PostImage>,
    @InjectRepository(PostLike)
    private postLikeRepository: Repository<PostLike>,
    @InjectRepository(PostComment)
    private postCommentRepository: Repository<PostComment>,
    @InjectRepository(Hashtag) private hashtagRepository: Repository<Hashtag>,
    @InjectRepository(PostHashtag)
    private postHashtagRepository: Repository<PostHashtag>,
    private dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    userId: number,
    createPostDto: CreatePostDto,
    images: Array<Express.Multer.File>,
  ) {
    const content = createPostDto.content?.trim();
    const normalizedHashtags = Array.from(
      new Set(
        (createPostDto.hashtags ?? [])
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
      ),
    );

    if (!content && images.length === 0) {
      throw new HttpException(
        'Post must have content or at least one image',
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploaded = images.length
      ? await Promise.all(
          images.map((image) => this.cloudinaryService.uploadFile(image)),
        )
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
            .values(
              normalizedHashtags.map((name: string) => ({
                name,
                postCount: 0,
              })),
            )
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
          publicIds.map((publicId) =>
            this.cloudinaryService.deleteFile(publicId),
          ),
        );
      }

      throw error;
    }
  }

  async update(
    postId: number,
    userId: number,
    updatePostDto: CreatePostDto,
    newImages: Array<Express.Multer.File>,
  ) {
    const content = updatePostDto.content?.trim();
    const isUpdatingHashtags = updatePostDto.hashtags !== undefined && updatePostDto.hashtags !== null;
    const normalizedHashtags = isUpdatingHashtags
      ? Array.from(
          new Set(
            (updatePostDto.hashtags ?? [])
              .map((tag: string) => tag.trim())
              .filter((tag: string) => tag.length > 0),
          ),
        )
      : [];

    if (!content && newImages.length === 0 && !isUpdatingHashtags) {
      throw new HttpException(
        'Update must provide at least content, images, or hashtags',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 1. FAST PATH: Check ownership BEFORE any uploads
    const post = await this.postRepository.findOne({
      where: { id: postId, isActive: true },
      relations: isUpdatingHashtags ? ['images', 'postHashtags'] : ['images'],
    });

    if (!post) {
      throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
    }

    if (post.userId !== userId) {
      throw new HttpException(
        'Not authorized to update this post',
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Upload new images (only if no images exist or user wants to update)
    const uploadedNew =
      newImages.length > 0
        ? await Promise.all(newImages.map((image) => this.cloudinaryService.uploadFile(image)))
        : [];

    const oldImages = post.images || [];
    const oldCloudinaryPublicIds = oldImages
      .map((img) => img.publicId)
      .filter((id): id is string => Boolean(id));

    try {
      return await this.dataSource.transaction(async (manager) => {
        // Update content
        if (content) {
          post.content = content;
        }

        // Update images
        if (newImages.length > 0) {
          const newImageEntities = uploadedNew.map((upload) =>
            manager.create(PostImage, {
              post,
              imageUrl: upload?.secure_url,
              publicId: upload?.public_id,
            }),
          );

          await manager.remove(oldImages);
          const savedImages = await manager.save(newImageEntities);
          post.images = savedImages;
        }

        // Update hashtags (only if explicitly provided)
        if (isUpdatingHashtags) {
          const oldPostHashtags = post.postHashtags || [];
          const oldHashtagIds = oldPostHashtags.map((ph) => ph.hashtagId);

          // Remove old hashtags
          if (oldHashtagIds.length > 0) {
            await manager.decrement(Hashtag, { id: In(oldHashtagIds) }, 'postCount', 1);
            await manager.remove(oldPostHashtags);
          }

          // Add new hashtags
          if (normalizedHashtags.length > 0) {
            await manager
              .createQueryBuilder()
              .insert()
              .into(Hashtag)
              .values(
                normalizedHashtags.map((name: string) => ({
                  name,
                  postCount: 0,
                })),
              )
              .orIgnore()
              .execute();

            const hashtagEntities = await manager.find(Hashtag, {
              where: { name: In(normalizedHashtags) },
            });

            const newPostHashtags = hashtagEntities.map((hashtag) =>
              manager.create(PostHashtag, {
                post,
                hashtag,
              }),
            );

            const savedPostHashtags = await manager.save(newPostHashtags);
            post.postHashtags = savedPostHashtags;

            await manager.increment(
              Hashtag,
              { id: In(hashtagEntities.map((h) => h.id)) },
              'postCount',
              1,
            );
          } else {
            post.postHashtags = [];
          }
        }

        const updatedPost = await manager.save(post);
        return plainToInstance(Post, updatedPost);
      });
    } catch (error) {
      // Rollback: delete uploaded files if transaction fails
      if (uploadedNew.length > 0) {
        const uploadedPublicIds: string[] = [];
        for (const upload of uploadedNew) {
            const publicId = (upload as { public_id?: string }).public_id;
          if (typeof publicId === 'string' && publicId.length > 0) {
            uploadedPublicIds.push(publicId);
          }
        }

        await Promise.allSettled(
          uploadedPublicIds.map((publicId) =>
            this.cloudinaryService.deleteFile(publicId),
          ),
        );
      }
      throw error;
    } finally {
      // Fire-and-forget: delete old images AFTER transaction (non-blocking)
      if (oldCloudinaryPublicIds.length > 0) {
        setImmediate(() => {
          Promise.allSettled(
            oldCloudinaryPublicIds.map((publicId) =>
              this.cloudinaryService.deleteFile(publicId),
            ),
          ).catch((err) =>
            console.error('Failed to delete old images from Cloudinary:', err),
          );
        });
      }
    }
  }

  async delete(postId: number, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const post = await manager.findOne(Post, {
        where: { id: postId, isActive: true },
        relations: ['postHashtags'],
      });

      if (!post) {
        throw new HttpException('Post not found', HttpStatus.NOT_FOUND);
      }

      if (post.userId !== userId) {
        throw new HttpException('Not authorized to delete this post', HttpStatus.FORBIDDEN);
      }

      // Decrement hashtag postCount for all associated hashtags
      const oldHashtagIds = (post.postHashtags || []).map((ph) => ph.hashtagId);
      if (oldHashtagIds.length > 0) {
        await manager.decrement(
          Hashtag,
          { id: In(oldHashtagIds) },
          'postCount',
          1,
        );
      }

      // Soft delete: mark post as inactive
      post.isActive = false;
      await manager.save(post);

      return { message: 'Post deleted successfully' };
    });
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.postRepository.findAndCount({
      where: search
        ? [
            { isActive: true, content: ILike(`%${search}%`) },
          ]
        : { isActive: true },
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
      relations: ['user', 'images', 'postHashtags', 'postHashtags.hashtag'],
    });
    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
    console.log('data lay tu DB');
    return response;
  }

  async findById(id: number) {
    const post = await this.postRepository.findOne({
      where: { id, isActive: true },
      relations: ['user', 'images', 'postHashtags', 'postHashtags.hashtag', 'likes', 'comments'],
    });
    if (!post) throw new HttpException('Not found post', HttpStatus.NOT_FOUND);
    return post;
  }
}

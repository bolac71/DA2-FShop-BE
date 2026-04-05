import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, ILike, In, Repository } from 'typeorm';
import { Hashtag, PostComment, PostHashtag, PostImage, PostLike, Post } from './entities';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCommentDto, CreatePostDto, UpdateCommentDto } from './dtos';
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

  async findAll(query: QueryDto, currentUserId?: number) {
    const { page, limit, search, hashtag, sortBy = 'id', sortOrder = 'DESC' } = query;

    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.images', 'images')
      .leftJoinAndSelect('post.postHashtags', 'postHashtags')
      .leftJoinAndSelect('postHashtags.hashtag', 'hashtag')
      .where('post.isActive = :isActive', { isActive: true })
      .distinct(true);

    if (search?.trim()) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('post.content ILIKE :search', { search: `%${search.trim()}%` })
            .orWhere('hashtag.name ILIKE :search', { search: `%${search.trim()}%` });
        }),
      );
    }

    if (hashtag?.trim()) {
      queryBuilder.andWhere('hashtag.name ILIKE :hashtag', { hashtag: `%${hashtag.trim()}%` });
    }

    queryBuilder.orderBy(`post.${sortBy}`, sortOrder);

    if (page && limit) {
      queryBuilder.skip((page - 1) * limit).take(limit);
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    const likedPostIds = currentUserId && data.length > 0
      ? new Set(
          (
            await this.postLikeRepository.find({
              where: { userId: currentUserId, postId: In(data.map((post) => post.id)) },
            })
          ).map((like) => like.postId),
        )
      : new Set<number>();

    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data: data.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
      })),
    };
    console.log('data lay tu DB');
    return response;
  }

  async findById(id: number, currentUserId?: number) {
    const post = await this.postRepository.findOne({
      where: { id, isActive: true },
      relations: ['user', 'images', 'postHashtags', 'postHashtags.hashtag', 'likes', 'comments'],
    });
    if (!post) throw new HttpException('Not found post', HttpStatus.NOT_FOUND);

    const isLiked = currentUserId
      ? await this.postLikeRepository.exist({ where: { postId: id, userId: currentUserId } })
      : false;

    return {
      ...post,
      isLiked,
    };
  }

  async toggleLike(postId: number, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Check post
      const post = await manager.findOne(Post, {
        where: {id: postId, isActive: true},
      })

      if (!post) throw new HttpException('Post not found', HttpStatus.NOT_FOUND);

      // 2. Check like
      const existingLike = await manager.findOne(PostLike, {
        where: {postId, userId}
      })

      if (existingLike) {
        await manager.remove(existingLike);
        post.totalLikes = Math.max(0, post.totalLikes - 1);
        await manager.save(post)
        return { message: 'Post unliked', totalLikes: post.totalLikes};
      }
      else {
        const user = await manager.findOne(User, {where: {id: userId}});
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

        const like = manager.create(PostLike, {post, user});
        await manager.save(like);

        post.totalLikes++;
        await manager.save(post);

        return { message: 'Post liked', totalLikes: post.totalLikes};
      }
    })
  }

  async addComment(postId: number, userId: number, createCommentDto: CreateCommentDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Check post
      const post = await manager.findOne(Post, {
        where: {id: postId, isActive: true},
      });
      if (!post) throw new HttpException('Post not found', HttpStatus.NOT_FOUND);

      // 2. Check user
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      // 3. Create comment
      const comment = manager.create(PostComment, {
        post,
        user, 
        content: createCommentDto.content,
        depth: 0,
        replyCount: 0,
        parentComment: null,
      })
      const savedComment = await manager.save(comment);
      post.totalComments++;
      await manager.save(post);

      return plainToInstance(PostComment, savedComment);
    })
  }

  async getComments(postId: number, query: QueryDto) {
    const post = await this.postRepository.findOne({
      where: {id: postId, isActive: true}
    })
    if (!post) throw new HttpException('Post not found', HttpStatus.NOT_FOUND);

    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;

    const [data, total] = await this.postCommentRepository.findAndCount({
      where: {postId, isActive: true},
      relations: ['user'],
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    })

    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    }
    return response;
  }

  async updateComment(commentId: number, userId: number, updateCommentDto: UpdateCommentDto) {
    return await this.dataSource.transaction(async (manager) => {
      const comment = await manager.findOne(PostComment, {
        where: { id: commentId},
        relations: ['user', 'post'],
      });

      if (!comment) throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);

      // Check ownership
      if (comment.user.id !== userId) {
        throw new HttpException('You can only update your own comments', HttpStatus.FORBIDDEN);
      }

      comment.content = updateCommentDto.content;
      await manager.save(comment);

      return { message: 'Comment updated successfully', comment };
    });
  }

  private async countTotalDescendants(commentId: number, manager: EntityManager): Promise<number> {
    const directReplies = await manager.find(PostComment, {
      where: { parentComment: { id: commentId } },
      select: ['id', 'replyCount'],
    });

    if (directReplies.length === 0) return 0;

    let total = directReplies.length;

    // Recursively count nested replies
    for (const reply of directReplies) {
      total += await this.countTotalDescendants(reply.id, manager);
    }

    return total;
  }
  
  async deleteComment(postId: number, commentId: number, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const comment = await manager.findOne(PostComment, {
        where: { id: commentId, post: { id: postId } },
        relations: ['user', 'post', 'parentComment'],
      });

      if (!comment) throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);

      // Check ownership
      if (comment.user.id !== userId) {
        throw new HttpException('You can only delete your own comments', HttpStatus.FORBIDDEN);
      }

      const post = comment.post;
      const parentComment = comment.parentComment;

      // Count total comments to be deleted (this comment + all nested descendants)
      const descendantsCount = await this.countTotalDescendants(comment.id, manager);
      const totalToDelete = 1 + descendantsCount;

      // If this is a reply, decrement parent's replyCount
      if (parentComment) {
        parentComment.replyCount = Math.max(0, parentComment.replyCount - 1);
        await manager.save(parentComment);
      }

      // Delete comment (cascade will delete all nested replies automatically)
      await manager.remove(comment);

      // Decrement post's totalComments by total deleted
      post.totalComments = Math.max(0, post.totalComments - totalToDelete);
      await manager.save(post);

      return {
        message: 'Comment deleted successfully',
        deletedCount: totalToDelete,
      };
    });
  }

  async addReply(postId: number, commentId: number, userId: number, dto: CreateCommentDto) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Check parent comment
      const parentComment = await manager.findOne(PostComment, {
        where: { id: commentId, post: { id: postId } },
        relations: ['post', 'post.user', 'user'],
      });
      if (!parentComment) throw new HttpException('Parent comment not found', HttpStatus.NOT_FOUND);

      // 2. Check user
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      // 3. Create reply - auto-calculate depth from parent
      const reply = manager.create(PostComment, {
        post: parentComment.post,
        user,
        content: dto.content,
        parentComment,
        depth: parentComment.depth + 1, // Auto-increment depth
        replyCount: 0,
      });

      const savedReply = await manager.save(reply);

      // 4. Update parent comment replyCount
      parentComment.replyCount += 1;
      await manager.save(parentComment);

      // 5. Update post totalComments
      parentComment.post.totalComments += 1;
      await manager.save(parentComment.post);

      return savedReply;
    });
  }

  async getReplies(postId: number, commentId: number, query: QueryDto) {
    // 1. Check parent comment
    const parentComment = await this.postCommentRepository.findOne({
      where: { id: commentId, post: { id: postId } },
    });

    if (!parentComment) throw new HttpException('Parent comment not found', HttpStatus.NOT_FOUND);

    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.postCommentRepository.findAndCount({
      where: { parentComment: { id: commentId }, content: search ? ILike(`%${search}%`) : undefined, isActive: true },
      relations: ['user'],
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    })
    return {
      pagination: {
        total, 
        page, 
        limit
      },
      data
    }
  }
}

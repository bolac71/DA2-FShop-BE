/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Review, ReviewImage, ReviewVote } from './entities';
import { DataSource, Like, Repository } from 'typeorm';
import { CreateReviewDto, UpdateReviewDto, VoteReviewDto } from './dtos';
import { Order, Product, User } from 'src/entities';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { OrderStatus } from 'src/constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { plainToInstance } from 'class-transformer';
import { QueryDto } from 'src/dtos';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRedis() private readonly redis: Redis,
    private dataSource: DataSource,
    private cloudinaryService: CloudinaryService,
  ) {}

  

  async create(userId: number, createReviewDto: CreateReviewDto, images: Array<Express.Multer.File>) {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Check user
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND)

      // 2. Check variant exists
      const variant = await manager.findOne(ProductVariant, { where: { id: createReviewDto.variantId } });
      if (!variant)
        throw new HttpException('Variant not found', HttpStatus.NOT_FOUND)

      // 3. Check order exists and belongs to user
      const order = await manager.findOne(Order, {
        where: {
          id: createReviewDto.orderId,
          user: { id: userId },
        },
        relations: ['items', 'items.variant'],
      });
      if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);

      // 4. Check order is delivered and contains the variant
      if (order.status !== OrderStatus.DELIVERED) 
        throw new HttpException('Cannot review an order that is not delivered', HttpStatus.BAD_REQUEST);
      const orderItem = order.items?.find(
        (item) => item.variant && item.variant.id === createReviewDto.variantId,
      );
      if (!orderItem)
        throw new HttpException('This variant is not part of the specified order', HttpStatus.BAD_REQUEST);

      // 5. Check if user already reviewed this variant in this order
      const existingReview = await manager.findOne(Review, {
        where: {
          user: { id: userId },
          variant: { id: createReviewDto.variantId },
          order: { id: createReviewDto.orderId },
        }
      })
      if (existingReview)
        throw new HttpException('You already reviewed this variant in this order', HttpStatus.BAD_REQUEST);

      const review = manager.create(Review, {
        user,
        order,
        variant,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      });
      const savedReview = await manager.save(review);

      // 6. Handle images if any
      if (images.length > 0) {
        const uploads = await Promise.all(
          images.map((image) => this.cloudinaryService.uploadFile(image)),
        );
        const imgs = uploads.map((u) =>
          manager.create(ReviewImage, {
            review: savedReview,
            imageUrl: u?.secure_url,
            publicId: u?.public_id,
          }),
        );
        await manager.save(imgs);
        savedReview.images = imgs;
      }

      await this.updateProductRating(manager, variant.productId);

      return plainToInstance(Review, savedReview);
    })
  }

  private async updateProductRating(manager: any, productId: number) {
    const { avg, count } = await manager
      .createQueryBuilder(Review, 'r')
      .innerJoin('r.variant', 'v')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('v.product = :productId', { productId })
      .andWhere('r.isActive = :isActive', { isActive: true })
      .getRawOne();

    await manager.update(Product, productId, {
      averageRating: avg ?? 0,
      reviewCount: count ?? 0,
    });
  }

  async findAll(query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const [data, total] = await this.reviewRepository.findAndCount({
      where: search ? [{ comment: Like(`%${search}%`), isActive: true }] : { isActive: true },
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
      relations: ['variant', 'variant.product', 'votes']
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

  async findMine(userId: number, query: QueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC' } = query;
    const sortableFields = new Set(['id', 'rating', 'createdAt', 'updatedAt']);
    const safeSortBy = sortableFields.has(sortBy) ? sortBy : 'id';

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('r.images', 'img')
      .leftJoinAndSelect('r.votes', 'vote')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere('r.comment LIKE :search', { search: `%${search}%` });
    }

    queryBuilder.orderBy(`r.${safeSortBy}`, sortOrder);

    if (page && limit) {
      queryBuilder.take(limit).skip((page - 1) * limit);
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
  }

  async vote(reviewId: number, userId: number, voteReviewDto: VoteReviewDto) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId, isActive: true } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const review = await manager.findOne(Review, { where: { id: reviewId, isActive: true } });
      if (!review) throw new HttpException('Review not found', HttpStatus.NOT_FOUND);

      if (review.userId !== userId) 
        throw new HttpException('You cannot vote on your own review', HttpStatus.BAD_REQUEST);

      const existingVote = await manager.findOne(ReviewVote, {
        where: { review: { id: reviewId }, user: { id: userId } },
      });
      if (existingVote) {
        existingVote.isHelpful = voteReviewDto.isHelpful;
        await manager.save(existingVote);
        return {
          message: 'Vote updated successfully',
          reviewId,
          userId,
          isHelpful: existingVote.isHelpful,
        };
      }

      const newNote = manager.create(ReviewVote, {
        review,
        user,
        isHelpful: voteReviewDto.isHelpful,
      });
      await manager.save(newNote);
      return {
        message: 'Vote created successfully',
        reviewId,
        userId,
        isHelpful: newNote.isHelpful,
      };
    })
  }

  async findByProduct(productId: number) {
    const reviews = await this.reviewRepository
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.variant', 'v')
      .innerJoinAndSelect('r.user', 'u')
      .leftJoinAndSelect('r.images', 'img')
      .leftJoinAndSelect('r.votes', 'vote')
      .where('v.product = :productId', { productId })
      .andWhere('r.isActive = :isActive', { isActive: true })
      .orderBy('r.createdAt', 'DESC')
      .getMany();

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      user: {
        id: r.user.id,
        name: r.user.fullName,
      },
      images: r.images.map((img) => img.imageUrl),
      helpfulCount: r.votes.filter((v) => v.isHelpful).length,
      createdAt: r.createdAt,
    }));
  }

  async getReviewSummary(productId: number) {
    const cachedKey = `review:summary:${productId}`;
    const cached = await this.redis.get(cachedKey);

    if (cached) return JSON.parse(cached);

    const summary = await this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id: productId },
      });
      if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);

      const results = await manager
        .createQueryBuilder(Review, 'r')
        .innerJoin('r.variant', 'v')
        .select('ROUND(r.rating)', 'rating')
        .addSelect('COUNT(r.id)', 'count')
        .where('v.product = :productId', { productId })
        .andWhere('r.isActive = :isActive', { isActive: true })
        .groupBy('ROUND(r.rating)')
        .getRawMany();

      const total = results.reduce((sum, r) => sum + Number(r.count), 0);
      const weightedSum = results.reduce(
        (sum, r) => sum + Number(r.count) * Number(r.rating),
        0,
      );
      const avg = total > 0 ? weightedSum / total : 0;

      const distribution = Object.fromEntries(
        [5, 4, 3, 2, 1].map((star) => [
          star,
          Number(results.find((r) => Number(r.rating) === star)?.count ?? 0),
        ]),
      );

      return {
        productId,
        reviewCount: total,
        averageRating: +avg.toFixed(1),
        distribution,
      };
    });

    // cache trong 5 mins
    await this.redis.set(cachedKey, JSON.stringify(summary), 'EX', 60 * 5);
    return summary;
  }

  async updateReview(
    reviewId: number,
    userId: number,
    dto: UpdateReviewDto,
    images: Array<Express.Multer.File>,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId, isActive: true } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const review = await manager.findOne(Review, {
        where: { id: reviewId, isActive: true },
        relations: ['variant', 'variant.product', 'images']
      })
      if (!review) throw new HttpException('Review not found', HttpStatus.NOT_FOUND)

      if (dto.rating !== undefined) review.rating = dto.rating;
      if (dto.comment !== undefined) review.comment = dto.comment;
      await manager.save(review);

      // xóa ảnh
      if (review.images?.length) {
        for (const img of review.images) {
          if (img.publicId) {
            try {
              await this.cloudinaryService.deleteFile(img.publicId);
            } catch {
              /* empty */
            }
          }
        }
        await manager.delete(ReviewImage, { review: { id: review.id } });
      }

      if (images?.length > 0) {
        const uploads = await Promise.all(
          images.map((image) => this.cloudinaryService.uploadFile(image)),
        );

        const newImages = uploads.map((u) =>
          manager.create(ReviewImage, {
            review,
            imageUrl: u?.secure_url,
            publicId: u?.public_id,
          }),
        );

        await manager.save(newImages);
        review.images = newImages;
      }
      await this.updateProductRating(manager, review.variant.productId)
      await this.redis.del(`review:summary:${review.variant.productId}`);

      return {
        ...review,
        message: 'Review updated successfully',
      };
    });
  }

  async deleteReview(reviewId: number, userId: number) {
    return await this.dataSource.transaction(async (manager) => {
      const review = await manager.findOne(Review, {
        where: { id: reviewId, user: { id: userId }, isActive: true },
        relations: ['variant', 'variant.product'],
      });

      if (!review) throw new HttpException('Review not found or unauthorized', HttpStatus.NOT_FOUND);

      // Soft delete: set isActive to false
      review.isActive = false;
      await manager.save(review);

      // Cập nhật lại average rating của product (chỉ tính reviews active)
      await this.updateProductRating(manager, review.variant.productId);
      await this.redis.del(`review:summary:${review.variant.productId}`);

      return { message: 'Review deleted successfully' };
    });
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Review, ReviewImage, ReviewVote } from './entities';
import { DataSource, Like, Repository } from 'typeorm';
import { CreateReviewDto, VoteReviewDto } from './dtos';
import { Order, Product, User } from 'src/entities';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import { OrderStatus } from 'src/constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { plainToInstance } from 'class-transformer';
import { QueryDto } from 'src/dtos';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepository: Repository<Review>,
    @InjectRepository(ReviewImage) private reviewImageRepository: Repository<ReviewImage>,
    @InjectRepository(ReviewVote) private reviewVoteRepository: Repository<ReviewVote>,
    @InjectRepository(ProductVariant) private variantRepository: Repository<ProductVariant>,
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
}

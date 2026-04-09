/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiNotFoundResponse, ApiConsumes } from '@nestjs/swagger';
import { CreateReviewDto, UpdateReviewDto, VoteReviewDto } from './dtos';
import { QueryDto } from 'src/dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new review' })
  @ApiNotFoundResponse({ description: 'Product or user not found' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'reviewImages', maxCount: 5 }]))
  create(
    @Req() request: Request,
    @Body() dto: CreateReviewDto,
    @UploadedFiles()
    files: { reviewImages?: Express.Multer.File[] },
  ) {
    const {sub} = request['user']
    return this.reviewsService.create(sub, dto, files.reviewImages ?? []);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews' })
  findAll(@Query() query: QueryDto) {
    return this.reviewsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get my reviews' })
  findMine(@Req() request: Request, @Query() query: QueryDto) {
    const { sub } = request['user']
    return this.reviewsService.findMine(sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/vote')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote for a review' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  vote(@Req() request: Request, @Param('id') id: number, @Body() voteReviewDto: VoteReviewDto) {
    const {sub} = request['user']
    return this.reviewsService.vote(id, sub, voteReviewDto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reviews by product' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  findByProduct(@Param('productId') productId: number) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('summary/:productId')
  @ApiOperation({ summary: 'Get review summary for a product' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getReviewSummary(@Param('productId') productId: number) {
    return this.reviewsService.getReviewSummary(productId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an existing review (rating, comment, images)' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'reviewImages', maxCount: 5 }]))
  updateReview(
    @Req() request: Request,
    @Param('id') id: number,
    @Body() dto: UpdateReviewDto,
    @UploadedFiles()
    files: { reviewImages?: Express.Multer.File[] },
  ) {
    const { sub } = request['user']
    return this.reviewsService.updateReview(id, sub, dto, files.reviewImages ?? []);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review (soft delete)' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  deleteReview(@Param('id') id: number, @Req() request: Request) {
    const { sub } = request['user']
    return this.reviewsService.deleteReview(id, sub);
  }
}

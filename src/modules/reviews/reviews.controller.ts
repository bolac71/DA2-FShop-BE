import { Body, Controller, Get, Param, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiNotFoundResponse, ApiConsumes } from '@nestjs/swagger';
import { CreateReviewDto, VoteReviewDto } from './dtos';
import { QueryDto } from 'src/dtos';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(AuthGuard('jwt'))
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

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/vote')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote for a review' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  vote(@Req() request: Request, @Param('id') id: number, @Body() voteReviewDto: VoteReviewDto) {
    const {sub} = request['user']
    return this.reviewsService.vote(id, sub, voteReviewDto);
  }
}

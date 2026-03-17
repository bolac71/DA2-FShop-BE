import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UnauthorizedException, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dtos';
import { QueryDto } from 'src/dtos';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new post with optional images and hashtags' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'postImages', maxCount: 10 }]))
  create(
    @Req() request: Request,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: { postImages?: Express.Multer.File[] },

  ) {
    const {sub} = request['user'];
    return this.postsService.create(sub, dto, files?.postImages ?? []);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an existing post (content, images, hashtags)' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'postImages', maxCount: 10 }]))
  update(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files: { postImages?: Express.Multer.File[] },
  ) {
    const {sub} = request['user'];
    return this.postsService.update(id, sub, dto, files?.postImages ?? []);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a post (mark as inactive)' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  delete(
    @Req() request: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { sub } = request['user'];
    return this.postsService.delete(id, sub);
  }


  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  findAll(@Query() query: QueryDto) {
    return this.postsService.findAll(query);
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiOperation({ summary: 'Get a post by id' })
  findOne(@Param('id') id: number) {
    return this.postsService.findById(id);
  }
}

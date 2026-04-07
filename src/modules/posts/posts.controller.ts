import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UnauthorizedException, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreateCommentDto, CreatePostDto, UpdateCommentDto } from './dtos';
import { QueryDto } from 'src/dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from 'src/guards/optional-jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
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


  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  findAll(@Req() request: Request, @Query() query: QueryDto) {
    const currentUserId = request['user']?.sub;
    return this.postsService.findAll(query, currentUserId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get('admin')
  @ApiOperation({ summary: 'Admin: Get all posts including inactive ones' })
  findAllAdmin(@Query() query: QueryDto) {
    return this.postsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Patch('admin/:id/status')
  @ApiOperation({ summary: 'Admin: Update post visibility status' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  updatePostStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ) {
    return this.postsService.updatePostStatus(id, body.isActive);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiOperation({ summary: 'Get a post by id' })
  findOne(@Req() request: Request, @Param('id') id: number) {
    const currentUserId = request['user']?.sub;
    return this.postsService.findById(id, currentUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like or unlike a post (toggle)' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  toggleLike(@Req() request: Request, @Param('id') id: number) {
    const { sub } = request['user'];
    return this.postsService.toggleLike(id, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  addComment(@Req() request: Request, @Param('id') id: number, @Body() dto: CreateCommentDto) {
    const { sub } = request['user'];
    return this.postsService.addComment(id, sub, dto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  getComments(@Param('id') id: number, @Query() query: QueryDto) {
    return this.postsService.getComments(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':postId/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  updateComment(
    @Req() request: Request,
    @Param('commentId') commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const { sub } = request['user'];
    return this.postsService.updateComment(commentId, sub, updateCommentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':postId/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  deleteComment(@Req() request: Request, @Param('postId') postId: number, @Param('commentId') commentId: number) {
    const { sub } = request['user'];
    return this.postsService.deleteComment(postId, commentId, sub);
  }


  @UseGuards(JwtAuthGuard)
  @Post(':postId/comments/:commentId/replies')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a reply to a comment' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  addReply(
    @Req() request: Request,
    @Param('postId') postId: number,
    @Param('commentId') commentId: number,
    @Body() dto: CreateCommentDto,
  ) {
    const { sub } = request['user'];
    return this.postsService.addReply(postId, commentId, sub, dto);
  }

  @Get(':postId/comments/:commentId/replies')
  @ApiOperation({ summary: 'Get replies for a comment (supports nested threading)' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  getReplies(
    @Param('postId') postId: number,
    @Param('commentId') commentId: number,
    @Query() query: QueryDto
  ) {
    return this.postsService.getReplies(postId, commentId, query);
  }


}

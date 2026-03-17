import { Body, Controller, Post, Req, UnauthorizedException, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dtos';

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
}

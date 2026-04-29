import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  AddLivestreamProductDto,
  CreateLivestreamCommentDto,
  CreateLivestreamDto,
  QueryLivestreamDto,
  UpdateLivestreamDto,
} from './dtos';
import { LivestreamsService } from './livestreams.service';
import { LivestreamsGateway } from './livestreams.gateway';

@Controller('livestreams')
export class LivestreamsController {
  constructor(
    private readonly livestreamsService: LivestreamsService,
    private readonly livestreamsGateway: LivestreamsGateway,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create livestream schedule' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'coverImage', maxCount: 1 }]))
  create(
    @Req() req: any,
    @Body() dto: CreateLivestreamDto,
    @UploadedFiles() files: { coverImage?: Express.Multer.File[] },
  ) {
    const { sub } = req['user'];
    return this.livestreamsService.create(sub, dto, files?.coverImage?.[0]);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update scheduled livestream' })
  @UseInterceptors(FileFieldsInterceptor([{ name: 'coverImage', maxCount: 1 }]))
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLivestreamDto,
    @UploadedFiles() files: { coverImage?: Express.Multer.File[] },
  ) {
    const { sub } = req['user'];
    return this.livestreamsService.update(id, sub, dto, files?.coverImage?.[0]);
  }

  @Post(':id/go-live')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start livestream' })
  goLive(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const { sub } = req['user'];
    return this.livestreamsService.goLive(id, sub);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End livestream' })
  end(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const { sub } = req['user'];
    return this.livestreamsService.end(id, sub);
  }

  @Post(':id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pin product to livestream' })
  addProduct(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLivestreamProductDto,
  ) {
    const { sub } = req['user'];
    return this.livestreamsService.addProduct(id, sub, dto);
  }

  @Delete(':id/products/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpin product from livestream' })
  removeProduct(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    const { sub } = req['user'];
    return this.livestreamsService.removeProduct(id, sub, productId);
  }

  @Get()
  @ApiOperation({ summary: 'Get livestream list' })
  findAll(@Query() query: QueryLivestreamDto) {
    return this.livestreamsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get livestream detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.livestreamsService.findOne(id);
  }

  @Get(':id/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get post-session summary for a livestream' })
  getSummary(@Param('id', ParseIntPipe) id: number) {
    return this.livestreamsService.getSummary(id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get livestream comments' })
  getComments(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: QueryLivestreamDto,
  ) {
    return this.livestreamsService.getComments(id, query);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post livestream comment' })
  addComment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateLivestreamCommentDto,
  ) {
    const { sub } = req['user'];
    return this.livestreamsService.addComment(id, sub, dto).then((comment) => {
      this.livestreamsGateway.emitNewComment(id, comment);
      return comment;
    });
  }

  @Get(':id/agora-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Issue agora RTC token for livestream channel' })
  issueAgoraToken(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const { sub } = req['user'];
    return this.livestreamsService.issueAgoraToken(id, sub);
  }
}

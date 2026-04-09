import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dtos';
import { Category } from './entities/category.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiConflictResponse, ApiNotFoundResponse, ApiConsumes } from '@nestjs/swagger';
import { QueryDto } from 'src/dtos/query.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new category' })
  @ApiConflictResponse({description: 'Category already exist'})
  @ApiConsumes('multipart/form-data')
  create(@Body() createCategoryDto: CreateCategoryDto, @UploadedFile() image: Express.Multer.File) {
    return this.categoriesService.create(createCategoryDto, image);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({summary: 'Update category'})
  @ApiConflictResponse({description: 'Category already exist'})
  @ApiNotFoundResponse({description: 'Category not found'})
  @ApiConsumes('multipart/form-data')
  update(@Param('id') id: number, @Body() updateCategoryDto: UpdateCategoryDto, @UploadedFile() image?: Express.Multer.File) {
    return this.categoriesService.update(id, updateCategoryDto, image);
  }

  @Delete(":id")
  @ApiOperation({summary: 'Delete category'})
  @ApiNotFoundResponse({description: 'Category not found'})
  remove(@Param("id") id: number) {
    return this.categoriesService.delete(id);
  }

  @Get()
  @ApiOperation({summary: 'Get all categories'})
  findAll(@Query() query: QueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({summary: 'Get category by id'})
  @ApiNotFoundResponse({description: 'Category not found'})
  getById(@Param('id') id: number) {
    return this.categoriesService.getById(id);
  }

  @Get('slugs/:slug')
  @ApiOperation({summary: 'Get category by slug'})
  @ApiNotFoundResponse({description: 'Category not found'})
  getBySlug(@Param('slug') slug: string) {
    return this.categoriesService.getBySlug(slug);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiCreatedResponse, ApiConflictResponse, ApiNotFoundResponse, ApiConsumes } from '@nestjs/swagger';
import { QueryDto } from 'src/dtos/query.dto';
import { CreateBrandDto } from './dtos/create-brand.dto';
import { UpdateBrandDto } from './dtos/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new brand' })
  @ApiCreatedResponse({description: 'Brand created successfully'})
  @ApiConsumes('multipart/form-data')
  @ApiConflictResponse({description: 'Brand already exists'})
  create(@Body() createBrandDto: CreateBrandDto, @UploadedFile() image: Express.Multer.File) {
    return this.brandsService.create(createBrandDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  findAll(@Query() query: QueryDto) {
    return this.brandsService.findAll(query);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({summary: 'Update brand'})
  @ApiConsumes('multipart/form-data')
  @ApiNotFoundResponse({description: 'Brand not found'})
  update(@Param('id') id: number, @Body() updateBrandDto: UpdateBrandDto, @UploadedFile() image: Express.Multer.File) {
    return this.brandsService.update(id, updateBrandDto, image);
  }

  @Delete(':id')
  @ApiOperation({summary: 'Delete brand'})
  @ApiNotFoundResponse({description: 'Brand not found'})
  delete(@Param('id') id: number) {
    return this.brandsService.delete(id);
  }

  @Get(':id')
  @ApiOperation({summary: 'Get brand by id'})
  @ApiNotFoundResponse({description: 'Brand not found'})
  getById(@Param('id') id: number) {
    return this.brandsService.getById(id);
  }

  @Get('slug/:slug')
  @ApiOperation({summary: 'Get brand by slug'})
  @ApiNotFoundResponse({description: 'Brand not found'})
  getBySlug(@Param('slug') slug: string) {
    return this.brandsService.getBySlug(slug);
  }
}

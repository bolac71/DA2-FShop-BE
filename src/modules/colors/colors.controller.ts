/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { ColorsService } from './colors.service';
import { CreateColorDto, UpdateColorDto } from './dtos';
import { Color } from './entities/color.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiCreatedResponse, ApiConsumes, ApiConflictResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { CreateBrandDto } from '../brands/dtos/create-brand.dto';
import { QueryDto } from 'src/dtos/query.dto';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new color' })
  @ApiCreatedResponse({ description: 'Color created successfully' })
  @ApiConflictResponse({ description: 'Color already exists' })
  create(@Body() createColorDto: CreateColorDto) {
    return this.colorsService.create(createColorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all colors' })
  findAll(@Query() query: QueryDto) {
    return this.colorsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get color by id' })
  @ApiNotFoundResponse({ description: 'Color not found' })
  getById(@Param('id') id: number) {
    return this.colorsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update color' })
  @ApiNotFoundResponse({ description: 'Color not found' })
  update(
    @Param('id') id: number,
    @Body() updateColorDto: UpdateColorDto,
  ) {
    return this.colorsService.update(id, updateColorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete color' })
  @ApiNotFoundResponse({ description: 'Color not found' })
  delete(@Param('id') id: number) {
    return this.colorsService.remove(id);
  }
}

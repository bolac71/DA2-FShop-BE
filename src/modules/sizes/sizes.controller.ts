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
  Query,
} from '@nestjs/common';
import { SizesService } from './sizes.service';
import { CreateSizeDto, UpdateSizeDto } from './dtos';
import { Size } from './entities/size.entity';
import { ApiOperation, ApiCreatedResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { QueryDto } from 'src/dtos/query.dto';

@Controller('sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new size' })
  @ApiCreatedResponse({ description: 'Size created successfully' })
  create(@Body() createSizeDto: CreateSizeDto) {
    return this.sizesService.create(createSizeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sizes' })
  findAll(@Query() query: QueryDto) {
    return this.sizesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get size by id' })
  @ApiNotFoundResponse({ description: 'Size not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sizesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update size' })
  @ApiNotFoundResponse({ description: 'Size not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSizeDto: UpdateSizeDto,
  ) {
    return this.sizesService.update(id, updateSizeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete size' })
  @ApiNotFoundResponse({ description: 'Size not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sizesService.remove(id);
  }
}

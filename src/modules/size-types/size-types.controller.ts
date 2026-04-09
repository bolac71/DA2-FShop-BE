import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpStatus, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SizeTypesService } from './size-types.service';
import { CreateSizeTypeDto, UpdateSizeTypeDto } from './dtos';
import { QueryDto } from 'src/dtos/query.dto';

@ApiTags('Size Types')
@Controller('size-types')
export class SizeTypesController {
  constructor(private readonly sizeTypesService: SizeTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new size type' })
  create(@Body() createSizeTypeDto: CreateSizeTypeDto) {
    return this.sizeTypesService.create(createSizeTypeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active size types' })
  findAll(@Query() query: QueryDto) {
    return this.sizeTypesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single size type by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sizeTypesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a size type' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSizeTypeDto: UpdateSizeTypeDto,
  ) {
    return this.sizeTypesService.update(id, updateSizeTypeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (soft delete) a size type' })
  @ApiNotFoundResponse({ description: 'Size type not found' })
  remove(@Param('id') id: number) {
    return this.sizeTypesService.remove(id);
  }
}

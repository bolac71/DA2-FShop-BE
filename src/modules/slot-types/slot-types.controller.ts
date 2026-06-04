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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/constants';
import { Roles } from 'src/decorators/roles.decorator';
import { QueryDto } from 'src/dtos/query.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { CreateSlotTypeDto, UpdateSlotTypeDto } from './dtos';
import { SlotTypesService } from './slot-types.service';

@ApiTags('Slot Types')
@Controller('slot-types')
export class SlotTypesController {
  constructor(private readonly slotTypesService: SlotTypesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new slot type (Admin)' })
  create(@Body() dto: CreateSlotTypeDto) {
    return this.slotTypesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active slot types' })
  findAll(@Query() query: QueryDto) {
    return this.slotTypesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get slot type by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.slotTypesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update slot type (Admin)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSlotTypeDto,
  ) {
    return this.slotTypesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete slot type (Admin)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.slotTypesService.remove(id);
  }
}

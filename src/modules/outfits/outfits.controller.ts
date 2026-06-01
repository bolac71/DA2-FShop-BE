import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateOutfitDto, UpdateOutfitDto } from './dtos';
import { OutfitsService } from './outfits.service';

@ApiTags('Outfits')
@Controller('outfits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OutfitsController {
  constructor(private readonly outfitsService: OutfitsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get saved outfits for current user' })
  findMine(@Req() req: Request) {
    return this.outfitsService.findMine(req['user'].sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a saved outfit' })
  create(@Req() req: Request, @Body() dto: CreateOutfitDto) {
    return this.outfitsService.create(req['user'].sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get outfit detail' })
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.outfitsService.findOneForUser(req['user'].sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved outfit' })
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOutfitDto,
  ) {
    return this.outfitsService.update(req['user'].sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved outfit' })
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.outfitsService.remove(req['user'].sub, id);
  }

  @Post(':id/add-to-cart')
  @ApiOperation({ summary: 'Add all outfit items to cart' })
  addToCart(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.outfitsService.addToCart(req['user'].sub, id);
  }
}

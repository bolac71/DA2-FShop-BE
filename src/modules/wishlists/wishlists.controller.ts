import { Body, Controller, Delete, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WishlistsService } from './wishlists.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateWishlistsDto } from './dtos/create-wishlits.dto';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) { }
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my wishlists' })
  async getAll(@Req() req: Request) {
    const { sub } = req['user'];
    return this.wishlistsService.getMyWishlists(sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('toggle')
  @ApiOperation({
    summary: 'Toggle wishlist item (add if not exists, remove if exists)',
  })
  async toggle(
    @Req() req: Request,
    @Body() createWishlistDto: CreateWishlistsDto,
  ) {
    const { sub } = req['user'];
    return this.wishlistsService.toggle(sub, createWishlistDto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Clear all wishlist items for the authenticated user',
  })
  async removeAll(@Req() req: Request) {
    const { sub } = req['user'];
    return this.wishlistsService.removeAll(sub);
  }
}

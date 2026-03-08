import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { CartsService } from './carts.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiCreatedResponse, ApiNotFoundResponse, ApiConflictResponse, ApiBearerAuth, ApiBadRequestResponse } from '@nestjs/swagger';
import { CreateCartDto, CartItemDto } from './dtos';

@Controller('carts')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cart' })
  @ApiCreatedResponse({description: 'Cart created successfully'})
  @ApiNotFoundResponse({description: 'User not found'})
  @ApiConflictResponse({description: 'User already have cart'})
  create(@Body() createCartDto: CreateCartDto) {
    return this.cartsService.create(createCartDto);
  }

  @Post('add')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiNotFoundResponse({description: 'Cart not found or variant not found'})
  @ApiBadRequestResponse({description: 'Not enough quantity'})
  addToCart(@Req() req: Request, @Body() addToCartDto: CartItemDto) {
    const {cartId} = req['user'];
    return this.cartsService.addToCart(cartId, addToCartDto);
  }

  @Post('remove')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiNotFoundResponse({description: 'Cart not found or cart item not found'})
  removeFromCart(@Req() req: Request, @Body() removeFromCartDto: CartItemDto) {
    const {cartId} = req['user'];
    return this.cartsService.removeFromtCart(cartId, removeFromCartDto);
  }

  @Get('/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get cart'})
  @ApiNotFoundResponse({description: 'Cart not found'})
  getCart(@Req() req: Request) {
    const {cartId} = req['user'];
    return this.cartsService.getCart(cartId);
  }
}

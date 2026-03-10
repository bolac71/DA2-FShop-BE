import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiNotFoundResponse, ApiBadRequestResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderQueryDto } from 'src/dtos';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new order for the authenticated user' })
  @ApiNotFoundResponse({
    description: 'User or address or cart item not found',
  })
  @ApiBadRequestResponse({ description: 'Not enough quantity' })
  create(@Req() req: Request, @Body() createOrderDto: CreateOrderDto) {
    const { sub } = req['user'];
    return this.ordersService.create(sub, createOrderDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all orders for the authenticated user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getMyOrders(@Req() req: Request, @Query() query: OrderQueryDto) {
    const { sub } = req['user'];
    return this.ordersService.getMyOrders(sub, query);
  }
}

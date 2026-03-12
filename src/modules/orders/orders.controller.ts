/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiNotFoundResponse, ApiBadRequestResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderQueryDto } from 'src/dtos';
import { RolesGuard } from 'src/guards/roles.guard';
import { Role } from 'src/constants';
import { Roles } from 'src/decorators/roles.decorator';
import { UpdateOrderStatusDto } from './dtos';
import { ActorRole } from 'src/utils/order-status.rules';

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

  @Get('all')
  // @UseGuards(AuthGuard('jwt'), RolesGuard)
  // @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all orders (admin)' })
  getAll(@Query() query: OrderQueryDto) {
    return this.ordersService.getAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':orderId')
  @ApiOperation({ summary: 'Get order by ID for the authenticated user' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getOrderById(@Param('orderId') orderId: number) {
    return this.ordersService.getOne(orderId);
  }

  // GET ORDER BY ID FOR AUTHENTICATED USER
  @UseGuards(AuthGuard('jwt'))
  @Get('me/:orderId')
  @ApiOperation({ summary: 'Get order by ID for the authenticated user' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getOrderByIdForUser(@Req() req: Request, @Param('orderId') orderId: number) {
    const { sub } = req['user'];
    return this.ordersService.getOneForUser(sub, orderId);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  updateOrderStatus(
    @Req() req: any,
    @Param('id') id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const actor = {
      id: req['user'].sub,
      role: req['user'].role as ActorRole,
      reason: dto['reason'],
    };
    return this.ordersService.updateStatus(id, dto.status, actor);
  }


}

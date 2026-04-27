import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  AdminQueryNotificationDto,
  CreateAdminBroadcastDto,
  QueryNotificationDto,
  RegisterDeviceTokenDto,
  UnregisterDeviceTokenDto,
} from './dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all notifications for admin dashboard' })
  getAdminNotifications(@Query() query: AdminQueryNotificationDto) {
    return this.notificationsService.getAdminNotifications(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/broadcast')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create and send broadcast notification to active users' })
  createAdminBroadcast(@Req() req: Request, @Body() dto: CreateAdminBroadcastDto) {
    const { sub } = req['user'];
    return this.notificationsService.createAdminBroadcast(dto, sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my notifications with pagination and sorting' })
  getMyNotifications(
    @Req() req: Request,
    @Query() query: QueryNotificationDto,
  ) {
    const { sub } = req['user'];
    return this.notificationsService.getMyNotifications(sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark one notification as read' })
  @Patch(':id/read')
  markOneAsRead(@Req() req: Request, @Param('id') id: number) {
    const { sub } = req['user'];
    return this.notificationsService.markOneAsRead(id, sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @Patch('/read-all')
  markAsRead(@Req() req: Request) {
    const { sub } = req['user'];
    return this.notificationsService.markAsRead(sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or refresh current device push token' })
  @Post('device-tokens/register')
  registerDeviceToken(
    @Req() req: Request,
    @Body() registerDeviceTokenDto: RegisterDeviceTokenDto,
  ) {
    const { sub } = req['user'];
    return this.notificationsService.registerDeviceToken(sub, registerDeviceTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate current device push token' })
  @Post('device-tokens/unregister')
  unregisterDeviceToken(
    @Req() req: Request,
    @Body() unregisterDeviceTokenDto: UnregisterDeviceTokenDto,
  ) {
    const { sub } = req['user'];
    return this.notificationsService.unregisterDeviceToken(sub, unregisterDeviceTokenDto.token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my registered device tokens' })
  @Get('device-tokens/me')
  getMyDeviceTokens(@Req() req: Request) {
    const { sub } = req['user'];
    return this.notificationsService.getMyDeviceTokens(sub);
  }
}

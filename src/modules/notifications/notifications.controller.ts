import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, QueryNotificationDto } from './dtos';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { ApiBasicAuth, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
}

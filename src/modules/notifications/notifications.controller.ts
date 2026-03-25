import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
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
}

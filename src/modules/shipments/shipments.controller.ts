/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';
import { Role } from 'src/constants';
import { ApiOperation } from '@nestjs/swagger';
import { AdminUpdateShipmentStatusDto } from './dtos/admin-update-shipment.dto';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import GoshipClient from 'src/integrations/goship/goship.client';
import type { GoshipWebhookPayload } from 'src/integrations/goship/goship.client';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId')
  async getShipmentsByOrder(
    @Req() req: Request,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const userId = req['user']?.sub as number | undefined;
    const latest = await this.shipmentsService.findLatestByOrder(orderId);

    if (!latest) {
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    }

    // allow owner or admin
    if (
      req['user']?.role !== 'admin' &&
      latest.order?.user?.id &&
      latest.order.user.id !== userId
    ) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return latest;
  }

  @UseGuards(JwtAuthGuard)
  @Get('order/:orderId/tracking')
  async getOrderTracking(
    @Req() req: Request,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    const userId = req['user']?.sub as number | undefined;
    return this.shipmentsService.getTrackingForOrder(
      orderId,
      req['user']?.role === 'admin' ? undefined : userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('order/:orderId/status')
  @ApiOperation({ summary: 'Admin manually updates shipment status (simulates webhook)' })
  async adminUpdateShipmentStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: AdminUpdateShipmentStatusDto,
  ) {
    return this.shipmentsService.adminUpdateStatus(orderId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('order/:orderId/cancel')
  async cancelShipmentByOrder(
    @Req() req: Request,
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    if (req['user']?.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return this.shipmentsService.cancelShipmentForOrder(orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cod/reconciliation')
  async getCodReconciliation(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('size') size?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (req['user']?.role !== 'admin') {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return this.shipmentsService.getCodReconciliation({
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
      from: from ? Number(from) : undefined,
      to: to ? Number(to) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('rates/preview')
  async getRatePreview(
    @Body()
    body: {
      addressTo: { city: string; district: string; ward: string };
      cod?: number;
      amount?: number;
      weight?: number;
      width?: number;
      height?: number;
      length?: number;
    },
  ) {
    return this.shipmentsService.getRatePreview(body);
  }

  @Post('webhooks/goship')
  @HttpCode(200)
  async handleGoshipWebhook(
    @Body() payload: GoshipWebhookPayload,
    @Headers('x-goship-hmac-sha256') signature?: string,
  ) {
    const verified = GoshipClient.verifyWebhookSignature(payload, signature);

    if (!verified) {
      return { status: 'ignored', reason: 'invalid_signature' };
    }

    const result = await this.shipmentsService.handleWebhookUpdate(payload);
    return { status: 'ok', result };
  }
}

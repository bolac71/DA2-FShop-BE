import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shipment } from './entities/shipment.entity';
import { Repository } from 'typeorm';
import { Order } from 'src/modules/orders/entities/order.entity';
import GoshipClient, {
  GoshipWebhookPayload,
} from 'src/integrations/goship/goship.client';
import { OrderStatus } from 'src/constants';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'src/constants/notification-type.enum';
import GoshipConfig from 'src/configs/goship.config';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment) private shipmentRepo: Repository<Shipment>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createForOrder(
    orderId: number,
    payload: Partial<Shipment>,
  ): Promise<Shipment> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order)
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);

    const duplicateByOrder = await this.shipmentRepo.findOne({
      where: {
        order: { id: orderId },
        shipmentProvider: payload.shipmentProvider,
      },
      order: { createdAt: 'DESC' },
    });
    if (duplicateByOrder && !payload.shipmentId) {
      return duplicateByOrder;
    }

    // prevent duplicate shipments for same order+provider+shipmentId
    if (payload.shipmentId) {
      const existing = await this.shipmentRepo.findOne({
        where: { shipmentId: payload.shipmentId },
      });
      if (existing) return existing;
    }

    const s = this.shipmentRepo.create({ ...payload, order });
    return await this.shipmentRepo.save(s);
  }

  async findByOrder(orderId: number): Promise<Shipment[]> {
    return this.shipmentRepo.find({ where: { order: { id: orderId } } });
  }

  async findLatestByOrder(orderId: number): Promise<Shipment | null> {
    return this.shipmentRepo.findOne({
      where: { order: { id: orderId } },
      order: { createdAt: 'DESC' },
      relations: ['order', 'order.user'],
    });
  }

  async getTrackingForOrder(orderId: number, userId?: number) {
    const shipment = await this.findLatestByOrder(orderId);
    if (!shipment) {
      throw new HttpException(
        'Shipment not found for order',
        HttpStatus.NOT_FOUND,
      );
    }

    if (userId && shipment.order?.user?.id !== userId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    if (!shipment.shipmentId) {
      throw new HttpException(
        'Missing provider shipment id',
        HttpStatus.BAD_REQUEST,
      );
    }

    const providerData = await GoshipClient.getTracking(shipment.shipmentId);

    return {
      shipment,
      providerData,
    };
  }

  async updateStatus(shipmentId: number, status: string, meta?: any) {
    const shipment = await this.shipmentRepo.findOne({
      where: { id: shipmentId },
      relations: ['order'],
    });
    if (!shipment)
      throw new HttpException('Shipment not found', HttpStatus.NOT_FOUND);
    shipment.shipmentStatus = status;
    if (meta)
      shipment.shipmentMeta = { ...(shipment.shipmentMeta || {}), ...meta };
    return this.shipmentRepo.save(shipment);
  }

  async cancelShipmentForOrder(orderId: number) {
    const shipment = await this.findLatestByOrder(orderId);
    if (!shipment || !shipment.shipmentId) {
      return { canceled: false, reason: 'Shipment not found' };
    }

    try {
      const providerRes = await GoshipClient.cancelShipment(
        shipment.shipmentId,
      );
      shipment.shipmentStatus = 'canceled';
      shipment.shipmentMeta = {
        ...(shipment.shipmentMeta || {}),
        canceledAt: new Date().toISOString(),
        cancelResponse: providerRes,
      };
      await this.shipmentRepo.save(shipment);
      return { canceled: true, providerRes };
    } catch (e) {
      shipment.lastError = e instanceof Error ? e.message : String(e);
      shipment.attempts = (shipment.attempts || 0) + 1;
      await this.shipmentRepo.save(shipment);
      return { canceled: false, reason: shipment.lastError };
    }
  }

  private mapGoshipStatusToOrderStatus(statusCode: number): OrderStatus | null {
    if ([901, 902].includes(statusCode)) return OrderStatus.AWAITING_PICKUP;
    if ([903, 918, 919].includes(statusCode)) return OrderStatus.IN_TRANSIT;
    if (statusCode === 904) return OrderStatus.OUT_FOR_DELIVERY;
    if ([905, 910, 911, 913].includes(statusCode)) return OrderStatus.DELIVERED;
    if ([906, 907, 908, 915, 916, 917, 1000].includes(statusCode))
      return OrderStatus.DELIVERY_FAILED;
    if (statusCode === 914) return OrderStatus.CANCELED;
    return null;
  }

  async handleWebhookUpdate(payload: GoshipWebhookPayload) {
    const statusCode = Number(payload.status);
    if (!payload.gcode) {
      throw new HttpException(
        'Missing gcode in webhook payload',
        HttpStatus.BAD_REQUEST,
      );
    }

    const shipment = await this.shipmentRepo.findOne({
      where: { shipmentId: payload.gcode },
      relations: ['order', 'order.user'],
    });

    if (!shipment) {
      // ack webhook without hard failure to avoid endless retries
      return { updated: false, reason: 'shipment_not_found' };
    }

    shipment.shipmentStatus = String(
      statusCode || payload.status_text || shipment.shipmentStatus || 'unknown',
    );
    shipment.shipmentStatusCode = Number.isFinite(statusCode)
      ? statusCode
      : shipment.shipmentStatusCode;
    shipment.trackingCode = payload.code || shipment.trackingCode;
    shipment.trackingUrl = payload.tracking_url || shipment.trackingUrl;
    shipment.shipmentMeta = {
      ...(shipment.shipmentMeta || {}),
      webhook: payload,
      trackingUrl: payload.tracking_url,
      statusText: payload.status_text,
      statusMessage: payload.message,
      statusDescription: payload.description,
      updatedAtWebhook: new Date().toISOString(),
    };
    await this.shipmentRepo.save(shipment);

    const mappedOrderStatus = this.mapGoshipStatusToOrderStatus(statusCode);
    if (mappedOrderStatus && shipment.order.status !== mappedOrderStatus) {
      shipment.order.status = mappedOrderStatus;
      await this.orderRepo.save(shipment.order);

      try {
        await this.notificationsService.create({
          userId: shipment.order.user.id,
          type: NotificationType.ORDER,
          title: `Đơn hàng #${shipment.order.id} cập nhật vận chuyển`,
          message: payload.status_text
            ? `Trạng thái mới: ${payload.status_text}`
            : 'Trạng thái vận đơn đã được cập nhật.',
        });
      } catch {
        // Best-effort notification
      }
    }

    return {
      updated: true,
      shipmentId: shipment.id,
      mappedOrderStatus,
    };
  }

  async getCodReconciliation(params?: {
    page?: number;
    size?: number;
    from?: number;
    to?: number;
  }) {
    const [invoices, transactions] = await Promise.all([
      GoshipClient.listInvoices(params),
      GoshipClient.listTransactions(params),
    ]);

    return {
      invoices,
      transactions,
    };
  }

  async getRatePreview(input: {
    addressTo: { city: string; district: string; ward: string };
    cod?: number;
    amount?: number;
    weight?: number;
    width?: number;
    height?: number;
    length?: number;
  }) {
    const from = GoshipConfig.shipper;
    if (!from.city || !from.district || !from.ward) {
      throw new HttpException(
        'Missing default shipper city/district/ward in config',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rates = await GoshipClient.getRates({
      addressFrom: {
        city: from.city,
        district: from.district,
        ward: from.ward,
      },
      addressTo: {
        city: input.addressTo.city,
        district: input.addressTo.district,
        ward: input.addressTo.ward,
      },
      parcel: {
        cod: Number(input.cod || 0),
        amount: Number(input.amount || 0),
        weight: Number(input.weight || GoshipConfig.parcelDefaults.weight),
        width: Number(input.width || GoshipConfig.parcelDefaults.width),
        height: Number(input.height || GoshipConfig.parcelDefaults.height),
        length: Number(input.length || GoshipConfig.parcelDefaults.length),
      },
    });

    return rates;
  }
}

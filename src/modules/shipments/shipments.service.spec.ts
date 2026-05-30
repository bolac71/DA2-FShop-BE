import { HttpException } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { NotificationType } from 'src/constants/notification-type.enum';
import { OrderStatus } from 'src/constants';

describe('ShipmentsService.handleWebhookUpdate', () => {
  const shipmentRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const orderRepo = {
    save: jest.fn(),
  };

  const notificationsService = {
    create: jest.fn(),
  };

  const createService = () =>
    new ShipmentsService(
      shipmentRepo as any,
      orderRepo as any,
      notificationsService as any,
    );

  const baseShipment = {
    id: 11,
    shipmentId: 'GSL9V2APK6',
    shipmentStatus: 'pending',
    shipmentStatusCode: 0,
    trackingCode: '',
    trackingUrl: '',
    shipmentMeta: {},
    order: {
      id: 101,
      status: OrderStatus.PENDING,
      user: { id: 55 },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    shipmentRepo.findOne.mockResolvedValue({ ...baseShipment });
    shipmentRepo.save.mockImplementation(async (shipment) => shipment);
    orderRepo.save.mockImplementation(async (order) => order);
    notificationsService.create.mockResolvedValue(undefined);
  });

  it('accepts shipment_code-only webhook payloads', async () => {
    const service = createService();

    const result = await service.handleWebhookUpdate({
      shipment_code: 'GSL9V2APK6',
      shipment_status: 903,
      status_text: 'In transit',
    } as any);

    expect(shipmentRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shipmentId: 'GSL9V2APK6' } }),
    );
    expect(shipmentRepo.save).toHaveBeenCalled();
    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.IN_TRANSIT }),
    );
    expect(notificationsService.create).toHaveBeenCalledWith({
      userId: 55,
      type: NotificationType.ORDER,
      title: 'Đơn hàng #101 cập nhật vận chuyển',
      message: 'Trạng thái mới: In transit',
    });
    expect(result).toMatchObject({
      updated: true,
      shipmentId: 11,
      mappedOrderStatus: OrderStatus.IN_TRANSIT,
    });
  });

  it('accepts legacy gcode webhook payloads', async () => {
    const service = createService();

    const result = await service.handleWebhookUpdate({
      gcode: 'GSL9V2APK6',
      status: 904,
      status_text: 'Out for delivery',
    } as any);

    expect(shipmentRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shipmentId: 'GSL9V2APK6' } }),
    );
    expect(orderRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OrderStatus.OUT_FOR_DELIVERY }),
    );
    expect(result).toMatchObject({
      updated: true,
      shipmentId: 11,
      mappedOrderStatus: OrderStatus.OUT_FOR_DELIVERY,
    });
  });

  it('rejects payloads without any shipment code', async () => {
    const service = createService();

    await expect(service.handleWebhookUpdate({ status: 900 } as any)).rejects.toBeInstanceOf(HttpException);
    expect(shipmentRepo.findOne).not.toHaveBeenCalled();
  });
});
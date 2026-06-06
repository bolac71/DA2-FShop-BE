/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Address,
  Cart,
  CartItem,
  Coupon,
  CouponRedemption,
  Inventory,
  InventoryTransaction,
  Order,
  OrderItem,
  ProductVariant,
  User,
  Payment,
  SystemSetting,
} from '../../entities';

import { UserInteractionsService } from '../user-interactions/user-interactions.service';
import { InteractionType } from '../user-interactions/entities/user-interaction.entity';

import {
  Brackets,
  DataSource,
  FindOptionsWhere,
  In,
  Like,
  Repository,
} from 'typeorm';
import { CreateOrderDto } from './dtos/create-order.dto';
import {
  CouponStatus,
  CouponType,
  NotificationType,
  RedemptionStatus,
  ShippingMethod,
  PaymentStatus,
  PaymentMethod,
} from '../../constants';
import { OrderStatus } from '../../constants/order-status.enum';
import { InventoryType } from '../../constants/inventory-type.enum';
import { OrderQueryDto } from '../../dtos';
import {
  ActorRole,
  ensureTransitionAllowed,
} from '../../utils/order-status.rules';

import { InventoriesModule } from '../inventories/inventories.module';
import { InventoriesService } from '../inventories/inventories.service';
import { ShipmentsService } from 'src/modules/shipments/shipments.service';
import GoshipClient from 'src/integrations/goship/goship.client';
import GoshipConfig from 'src/configs/goship.config';
import { NotificationsService } from '../notifications/notifications.service';
import { Livestream, LivestreamOrder } from '../livestreams/entities';
import { LivestreamStatus } from '../../constants/livestream-status.enum';
import { MetricsService } from '../metrics/metrics.service';

type GoshipRateOption = {
  id: string;
  carrier_name?: string;
  carrier_logo?: string;
  service?: string;
  expected?: string;
  cod_fee?: number | string;
  total_fee?: number | string;
  total_amount?: number | string;
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoriesService: InventoriesService,
    private notificationService: NotificationsService,
    private readonly interactionsService: UserInteractionsService,
    private readonly shipmentsService: ShipmentsService,
    private readonly metricsService: MetricsService,
  ) {}

  private calculateShippingFee(shippingMethod: ShippingMethod): number {
    switch (shippingMethod) {
      case ShippingMethod.STANDARD:
        return 10000;
      case ShippingMethod.EXPRESS:
        return 20000;
      default:
        return 30000;
    }
  }

  private async fetchAvailableRates(
    address: Address,
    subtotal: number,
    paymentMethod?: PaymentMethod,
  ) {
    return GoshipClient.getRates({
      addressFrom: {
        city: GoshipConfig.shipper.city,
        district: GoshipConfig.shipper.district,
        ward: GoshipConfig.shipper.ward,
      },
      addressTo: {
        city: String(address.province || ''),
        district: String(address.district || ''),
        ward: String(address.commune || ''),
      },
      parcel: {
        cod: paymentMethod === PaymentMethod.COD ? Number(subtotal || 0) : 0,
        amount: Number(subtotal || 0),
        weight: GoshipConfig.parcelDefaults.weight,
        width: GoshipConfig.parcelDefaults.width,
        height: GoshipConfig.parcelDefaults.height,
        length: GoshipConfig.parcelDefaults.length,
      },
    });
  }

  private async resolveSelectedRate(
    address: Address,
    subtotal: number,
    createOrderDto: CreateOrderDto,
  ): Promise<{ rate: GoshipRateOption; shippingFee: number } | null> {
    if (!createOrderDto.shippingRateId) {
      return null;
    }

    const rates = await this.fetchAvailableRates(
      address,
      subtotal,
      createOrderDto.paymentMethod,
    );

    const selectedRate = rates.find(
      (rate) => rate.id === createOrderDto.shippingRateId,
    );
    if (!selectedRate) {
      throw new HttpException(
        'Selected Goship rate is no longer available',
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      rate: selectedRate,
      shippingFee: Number(selectedRate.total_fee ?? 0),
    };
  }

  private calculateCouponDiscount(
    coupon: Coupon,
    subtotal: number,
    shippingFee: number,
  ) {
    if (coupon.type === CouponType.SHIPPING) {
      return shippingFee;
    }

    if (coupon.type === CouponType.FIXED) {
      return Math.min(subtotal, Number(coupon.value));
    }

    const percentDiscount = (subtotal * Number(coupon.value)) / 100;
    if (Number(coupon.maxDiscountAmount) > 0) {
      return Math.min(percentDiscount, Number(coupon.maxDiscountAmount));
    }

    return percentDiscount;
  }

  private getOrderStatusLabel(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'chờ xác nhận',
      [OrderStatus.CONFIRMED]: 'đã xác nhận',
      [OrderStatus.AWAITING_PICKUP]: 'chờ lấy hàng',
      [OrderStatus.IN_TRANSIT]: 'đang vận chuyển',
      [OrderStatus.OUT_FOR_DELIVERY]: 'đang giao',
      [OrderStatus.DELIVERED]: 'đã giao',
      [OrderStatus.DELIVERY_FAILED]: 'giao thất bại',
      [OrderStatus.CANCELED]: 'đã hủy',
    };

    return map[status] ?? status;
  }

  private buildOrderStatusNotification(
    orderId: number,
    from: OrderStatus,
    to: OrderStatus,
    actorRole: ActorRole,
  ): { title: string; message: string } | null {
    if (from === to) return null;

    const fromLabel = this.getOrderStatusLabel(from);
    const toLabel = this.getOrderStatusLabel(to);

    return {
      title: `Cập nhật đơn hàng #${orderId}`,
      message:
        actorRole === 'admin'
          ? `Đơn hàng #${orderId} đã được cập nhật từ ${fromLabel} sang ${toLabel}.`
          : `Bạn đã cập nhật đơn hàng #${orderId} từ ${fromLabel} sang ${toLabel}.`,
    };
  }

  async create(userId: number, createOrderDto: CreateOrderDto) {
    this.logger.log(
      `Create order start: user=${userId}, address=${createOrderDto.addressId}, items=${createOrderDto.items.length}`,
    );

    const result = await this.dataSource.manager.transaction(
      async (manager) => {
        // Implementation for creating order within a transaction
        const {
          addressId,
          couponId,
          note,
          shippingMethod,
          paymentMethod,
          items,
          shippingRateId,
          shippingCarrierName,
          shippingServiceName,
          shippingExpected,
          shippingRateFee,
          shippingTrackingUrl,
        } = createOrderDto;

        if (createOrderDto.livestreamId) {
          const livestream = await manager.findOne(Livestream, {
            where: {
              id: createOrderDto.livestreamId,
              isActive: true,
              status: LivestreamStatus.LIVE,
            },
          });

          if (!livestream) {
            throw new HttpException(
              'Livestream not found or is not live',
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        // Validate user and address
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user)
          throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        const address = await manager.findOne(Address, {
          where: { id: addressId, user: { id: userId } },
        });
        if (!address)
          throw new HttpException('Address not found', HttpStatus.NOT_FOUND);

        // 2. Get cart with items
        const cart = await manager.findOne(Cart, {
          where: { user: { id: userId } },
          relations: [
            'items',
            'items.variant',
            'user',
            'items.variant.product',
          ],
        });

        // 3. Calculate shipping fee
        let shippingFee = this.calculateShippingFee(shippingMethod);

        // 4. Resolve Goship rate if provided and create order (without totalAmount first)
        let selectedRate: GoshipRateOption | null = null;

        // subtotal is computed later, but if a rate is requested we will resolve it once subtotal is known
        const order = manager.create(Order, {
          user: user,
          recipientName: address.recipientName,
          recipientPhone: address.recipientPhone,
          detailAddress: address.detailAddress,
          province: address.province,
          district: address.district,
          commune: address.commune,
          status: OrderStatus.PENDING,
          note: note,
          shippingMethod,
          paymentMethod,
          shippingFee,
          totalAmount: 0,
        });
        await manager.save(order);

        // 5. Create order items and calculate total amount
        let subtotal = 0;
        const orderedProductIds: number[] = [];
        const orderItems = [];

        for (const item of items) {
          const variant = await manager.findOne(ProductVariant, {
            where: { id: item.variantId },
            relations: ['product', 'size', 'color'],
          });
          if (!variant)
            throw new HttpException(
              `Product variant with id ${item.variantId} not found`,
              HttpStatus.NOT_FOUND,
            );
          if (!variant.product)
            throw new HttpException(
              `Product not found for variant ${item.variantId}`,
              HttpStatus.NOT_FOUND,
            );

          const inventory = await manager.findOne(Inventory, {
            where: { variant: { id: item.variantId } },
          });
          if (!inventory)
            throw new HttpException(
              `Inventory not found for variant ${item.variantId}`,
              HttpStatus.NOT_FOUND,
            );

          if (inventory.quantity < item.quantity) {
            throw new HttpException(
              `Insufficient stock for variant ${item.variantId}. Available: ${inventory.quantity}, Required: ${item.quantity}`,
              HttpStatus.BAD_REQUEST,
            );
          }

          // Create order item
          const orderItem = manager.create(OrderItem, {
            order,
            variant,
            quantity: item.quantity,
            price: variant.product.price,
            livestreamId: item.livestreamId || null,
          });
          await manager.save(orderItem);
          subtotal += Number(variant.product.price) * item.quantity;
          orderedProductIds.push(variant.product.id);

          inventory.quantity -= item.quantity;
          await manager.save(inventory);

          // Cảnh báo tồn kho cho Admin
          try {
            const lowStockSetting = await manager.findOne(SystemSetting, {
              where: { key: 'STOCK_LOW_THRESHOLD' },
            });
            const lowStockThreshold = lowStockSetting ? parseInt(lowStockSetting.value, 10) : 5;

            if (inventory.quantity === 0) {
              await this.notificationService.notifyAdmins({
                type: NotificationType.INVENTORY,
                title: `Sản phẩm hết hàng`,
                message: `Sản phẩm ${variant.product.name} đã hết hàng.`,
                referenceId: variant.productId,
              });
            } else if (inventory.quantity < lowStockThreshold) {
              const sizeLabel = variant.size?.name ? ` - Size ${variant.size.name}` : '';
              const colorLabel = variant.color?.name ? ` - Màu ${variant.color.name}` : '';
              await this.notificationService.notifyAdmins({
                type: NotificationType.INVENTORY,
                title: `Cảnh báo tồn kho thấp`,
                message: `Cảnh báo: Sản phẩm ${variant.product.name}${sizeLabel}${colorLabel} chỉ còn ${inventory.quantity} sản phẩm trong kho.`,
                referenceId: variant.productId,
              });
            }
          } catch (err) {
            this.logger.error(`Failed to trigger inventory low/out-of-stock notifications: ${err.message}`);
          }

          const inventoryTransaction = manager.create(InventoryTransaction, {
            variantId: variant.id,
            userId,
            type: InventoryType.EXPORT,
            quantity: item.quantity,
            note: `Order #${order.id} - ${user.email}`,
          });
          await manager.save(inventoryTransaction);

          if (cart && cart.items.length > 0) {
            const cartItem = cart.items.find(
              (ci) => ci.variant.id === variant.id && ci.livestreamId === (item.livestreamId || null),
            );

            if (cartItem) {
              if (item.quantity >= cartItem.quantity) {
                await manager.remove(cartItem);
              } else {
                cartItem.quantity -= item.quantity;
                await manager.save(CartItem, cartItem);
              }
            }
          }
        }

        const rateResolution = await this.resolveSelectedRate(
          address,
          subtotal,
          createOrderDto,
        );
        if (rateResolution) {
          selectedRate = rateResolution.rate;
          shippingFee = rateResolution.shippingFee;
          order.shippingRateId = selectedRate.id;
          order.shippingCarrierName =
            shippingCarrierName || selectedRate.carrier_name || '';
          order.shippingServiceName =
            shippingServiceName || selectedRate.service || '';
          order.shippingExpected =
            shippingExpected || selectedRate.expected || '';
          order.shippingRateFee = Number(shippingRateFee ?? shippingFee);
          order.shippingTrackingUrl = shippingTrackingUrl || '';
        }

        let discountAmount = 0;

        if (couponId) {
          const coupon = await manager.findOne(Coupon, {
            where: { id: couponId, isActive: true },
          });
          if (!coupon) {
            throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
          }

          const now = new Date();
          if (
            coupon.status !== CouponStatus.ACTIVE ||
            now < new Date(coupon.startDate) ||
            now > new Date(coupon.endDate)
          ) {
            throw new HttpException(
              'Coupon is not active',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (
            Number(coupon.maxUses) > 0 &&
            Number(coupon.usedCount) >= Number(coupon.maxUses)
          ) {
            throw new HttpException(
              'Coupon has reached maximum uses',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (subtotal < Number(coupon.minOrderAmount)) {
            throw new HttpException(
              'Order does not meet coupon minimum amount',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (
            coupon.applicableProduct &&
            !orderedProductIds.includes(coupon.applicableProduct)
          ) {
            throw new HttpException(
              'Coupon is not applicable to selected products',
              HttpStatus.BAD_REQUEST,
            );
          }

          if (Number(coupon.perUserLimit) > 0) {
            const redeemedCount = await manager.count(CouponRedemption, {
              where: {
                couponId: coupon.id,
                userId,
                status: In([
                  RedemptionStatus.APPLIED,
                  RedemptionStatus.REDEEMED,
                ]),
              },
            });

            if (redeemedCount >= Number(coupon.perUserLimit)) {
              throw new HttpException(
                'Coupon has reached per-user limit',
                HttpStatus.BAD_REQUEST,
              );
            }
          }

          discountAmount = this.calculateCouponDiscount(
            coupon,
            subtotal,
            shippingFee,
          );

          coupon.usedCount = Number(coupon.usedCount) + 1;
          await manager.save(coupon);

          const couponRedemption = manager.create(CouponRedemption, {
            couponId: coupon.id,
            userId,
            orderId: order.id,
            discountAmount,
            status: RedemptionStatus.APPLIED,
          });
          await manager.save(couponRedemption);
        }

        order.shippingFee = shippingFee;
        order.totalAmount = Math.max(
          0,
          subtotal + shippingFee - discountAmount,
        );
        await manager.save(order);

        if (createOrderDto.livestreamId) {
          const livestreamOrder = manager.create(LivestreamOrder, {
            livestreamId: createOrderDto.livestreamId,
            orderId: order.id,
          });
          await manager.save(livestreamOrder);
        }

        return { order, orderedProductIds, user };
      },
    );

    const createdOrder = result.order;
    const orderedProductIds = result.orderedProductIds;
    const orderUser = result.user;

    this.logger.log(
      `Create order committed: order=${createdOrder.id}, user=${userId}, total=${createdOrder.totalAmount}`,
    );
    this.metricsService.recordOrderCreated(
      createOrderDto.livestreamId ? 'livestream' : 'standard',
    );

    try {
      this.logger.log(
        `Trigger order notification: order=${createdOrder.id}, user=${userId}`,
      );
      await this.notificationService.create({
        userId,
        type: NotificationType.ORDER,
        title: `Đặt hàng #${createdOrder.id} thành công`,
        message: `Đơn hàng #${createdOrder.id} đã được tạo. Vui lòng theo dõi trạng thái trong mục Đơn hàng của tôi.`,
        referenceId: createdOrder.id,
      });
      this.logger.log(
        `Order notification success: order=${createdOrder.id}, user=${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Order notification failed: order=${createdOrder.id}, user=${userId}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    try {
      this.logger.log(
        `Trigger admin order notification: order=${createdOrder.id}`,
      );
      await this.notificationService.notifyAdmins({
        type: NotificationType.ORDER,
        title: `Đơn hàng mới #${createdOrder.id}`,
        message: `Có đơn hàng mới #${createdOrder.id} từ khách hàng ${orderUser.fullName || orderUser.email} đang chờ xác nhận.`,
        referenceId: createdOrder.id,
      });
    } catch (error) {
      this.logger.error(
        `Admin order notification failed: order=${createdOrder.id}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    // Record interactions for each product in the order
    try {
      const uniqueProductIds = Array.from(new Set(orderedProductIds));
      for (const pid of uniqueProductIds) {
        this.interactionsService
          .recordInteraction(userId, pid, InteractionType.PURCHASE)
          .catch((err) =>
            console.error(
              `Failed to record purchase interaction for product ${pid}:`,
              err,
            ),
          );
      }
    } catch (error) {
      this.logger.error(
        'Failed to process purchase interactions',
        error instanceof Error ? error.stack : undefined,
      );
    }

    return createdOrder;
  }

  async getMyOrders(userId: number, query: OrderQueryDto) {
    const {
      page,
      limit,
      sortBy = 'id',
      sortOrder = 'DESC',
      status,
      search,
    } = query;
    const sortFieldMap: Record<string, string> = {
      id: 'order.id',
      createdAt: 'order.createdAt',
      updatedAt: 'order.updatedAt',
      totalAmount: 'order.totalAmount',
      status: 'order.status',
    };

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoin('order.user', 'user')
      .where('user.id = :userId', { userId })
      .distinct(true);

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (search?.trim()) {
      const normalizedSearch = `%${search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('CAST(order.id AS VARCHAR) LIKE :search', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(order.recipientName) LIKE LOWER(:search)', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(order.detailAddress) LIKE LOWER(:search)', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(order.note) LIKE LOWER(:search)', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(product.name) LIKE LOWER(:search)', {
              search: normalizedSearch,
            });
        }),
      );
    }

    qb.orderBy(sortFieldMap[sortBy] ?? 'order.id', sortOrder);

    if (page && limit) {
      qb.take(limit).skip((page - 1) * limit);
    }

    const [data, total] = await qb.getManyAndCount();

    return { pagination: { total, page, limit }, data };
  }

  async getAll(query: OrderQueryDto) {
    const { page, limit, search, sortBy = 'id', sortOrder = 'DESC', status } = query;
    const sortFieldMap: Record<string, string> = {
      id: 'order.id',
      createdAt: 'order.createdAt',
      updatedAt: 'order.updatedAt',
      totalAmount: 'order.totalAmount',
      status: 'order.status',
    };

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('order.user', 'user')
      .distinct(true);

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (search?.trim()) {
      const normalizedSearch = `%${search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('CAST(order.id AS VARCHAR) LIKE :search', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(order.recipientName) LIKE LOWER(:search)', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(order.detailAddress) LIKE LOWER(:search)', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(order.note) LIKE LOWER(:search)', {
              search: normalizedSearch,
            })
            .orWhere('LOWER(product.name) LIKE LOWER(:search)', {
              search: normalizedSearch,
            });
        }),
      );
    }

    qb.orderBy(sortFieldMap[sortBy] ?? 'order.id', sortOrder);

    if (page && limit) {
      qb.take(limit).skip((page - 1) * limit);
    }

    const [data, total] = await qb.getManyAndCount();

    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
    console.log('data lay tu DB');
    return response;
  }

  async getOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });
    if (!order)
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }

  async getOneForUser(userId: number, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });
    if (!order)
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }

  async updateStatus(
    orderId: number,
    next: OrderStatus,
    actor: {
      id: number;
      role: ActorRole;
      reason?: string;
      trackingCode?: string;
      carrierName?: string;
      trackingUrl?: string;
      receivedBy?: string;
      currentLocation?: string;
      shipperName?: string;
      shipperPhone?: string;
    },
  ) {
    console.log(
      `Updating order status: orderId=${orderId}, nextStatus=${next}, actorId=${actor.id}, actorRole=${actor.role}`,
    );

    const result = await this.dataSource.manager.transaction(
      async (manager) => {
        const order = await manager.findOne(Order, {
          where: { id: orderId },
          relations: ['items', 'items.variant', 'user'],
        });
        if (!order)
          throw new HttpException('Order not found', HttpStatus.NOT_FOUND);

        try {
          ensureTransitionAllowed(order.status, next, actor.role);
        } catch (e) {
          throw new HttpException(String(e), HttpStatus.BAD_REQUEST);
        }

        // Check payment status before transitioning PENDING -> CONFIRMED
        if (
          order.status === OrderStatus.PENDING &&
          next === OrderStatus.CONFIRMED
        ) {
          const payment = await manager.findOne(Payment, {
            where: { orderId: order.id },
          });

          // If payment exists, ensure it's completed (unless it's COD)
          if (payment) {
            if (payment.status !== PaymentStatus.COMPLETED) {
              throw new HttpException(
                `Payment required. Current payment status: ${payment.status}`,
                HttpStatus.PAYMENT_REQUIRED,
              );
            }
          } else if (actor.role === 'user') {
            // User cannot transition without payment
            throw new HttpException(
              'Payment must be initiated before confirming order',
              HttpStatus.PAYMENT_REQUIRED,
            );
          }
          // Admin can bypass payment check
        }
        if (next === OrderStatus.CANCELED) {
          const inventoryItems: {
            variant: ProductVariant;
            quantity: number;
          }[] = [];

          for (const it of order.items) {
            const variant = await manager
              .createQueryBuilder(ProductVariant, 'variant')
              .innerJoinAndSelect('variant.product', 'product')
              .where('variant.id = :id', { id: it.variant.id })
              .setLock('pessimistic_write')
              .getOne();

            if (!variant)
              throw new HttpException(
                'Product variant not found',
                HttpStatus.NOT_FOUND,
              );

            const inventory = await manager.findOne(Inventory, {
              where: { variant: { id: it.variant.id } },
            });
            if (!inventory)
              throw new HttpException(
                `Inventory not found for variant ${it.variant.id}`,
                HttpStatus.NOT_FOUND,
              );

            inventory.quantity += it.quantity;
            await manager.save(inventory);
            inventoryItems.push({ variant, quantity: it.quantity });
          }

          if (inventoryItems.length > 0) {
            const reasonNote =
              next === OrderStatus.CANCELED
                ? `Return products for shop for order #${order.id}`
                : `Return products for order #${order.id}`;

            for (const item of inventoryItems) {
              const inventoryTransaction = manager.create(
                InventoryTransaction,
                {
                  variantId: item.variant.id,
                  userId: actor.id,
                  type: InventoryType.RETURN,
                  quantity: item.quantity,
                  note: reasonNote,
                },
              );
              await manager.save(inventoryTransaction);
            }
          }
        }

        const prev = order.status;
        order.status = next;
        await manager.save(order);

        return {
          message: 'Order status updated',
          from: prev,
          to: next,
          userId: order.user.id,
          orderId: order.id,
        };
      },
    );

    console.log(
      `Update order status committed: order=${result.orderId}, from=${result.from}, to=${result.to}`,
    );

    // Sync to Shipment / GOSHIP if order status transitions manually
    if (next === OrderStatus.AWAITING_PICKUP) {
      try {
        await this.shipmentsService.adminUpdateStatus(orderId, {
          statusCode: 901,
          statusText: 'Chờ lấy hàng',
          trackingCode: actor.trackingCode,
          carrierName: actor.carrierName,
          trackingUrl: actor.trackingUrl,
        });
      } catch (error) {
        this.logger.error(`Failed to sync manual AWAITING_PICKUP to GOSHIP shipment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (next === OrderStatus.IN_TRANSIT) {
      try {
        await this.shipmentsService.adminUpdateStatus(orderId, {
          statusCode: 902,
          statusText: 'Đang vận chuyển',
          currentLocation: actor.currentLocation,
        });
      } catch (error) {
        this.logger.error(`Failed to sync manual IN_TRANSIT to GOSHIP shipment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (next === OrderStatus.OUT_FOR_DELIVERY) {
      try {
        await this.shipmentsService.adminUpdateStatus(orderId, {
          statusCode: 904,
          statusText: 'Đang giao hàng',
          shipperName: actor.shipperName,
          shipperPhone: actor.shipperPhone,
        });
      } catch (error) {
        this.logger.error(`Failed to sync manual OUT_FOR_DELIVERY to GOSHIP shipment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (next === OrderStatus.DELIVERED) {
      try {
        await this.shipmentsService.adminUpdateStatus(orderId, {
          statusCode: 905,
          statusText: 'Giao thành công',
          receivedBy: actor.receivedBy,
        });
      } catch (error) {
        this.logger.error(`Failed to sync manual DELIVERED to GOSHIP shipment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (next === OrderStatus.DELIVERY_FAILED) {
      try {
        await this.shipmentsService.adminUpdateStatus(orderId, {
          statusCode: 906,
          statusText: 'Giao hàng thất bại',
          cancelReason: actor.reason,
        });
      } catch (error) {
        this.logger.error(`Failed to sync manual DELIVERY_FAILED to GOSHIP shipment: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (next === OrderStatus.CANCELED) {
      try {
        await this.shipmentsService.adminUpdateStatus(orderId, {
          statusCode: 910,
          statusText: 'Đã hủy đơn',
          cancelReason: actor.reason,
        });
      } catch (error) {
        this.logger.error(`Failed to sync manual CANCELED to GOSHIP shipment: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const notificationPayload = this.buildOrderStatusNotification(
      result.orderId,
      result.from,
      result.to,
      actor.role,
    );

    if (notificationPayload) {
      try {
        console.log(
          `Trigger status notification: order=${result.orderId}, user=${result.userId}`,
        );
        await this.notificationService.create({
          userId: result.userId,
          type: NotificationType.ORDER,
          title: notificationPayload.title,
          message: notificationPayload.message,
          referenceId: result.orderId,
        });
        console.log(
          `Status notification success: order=${result.orderId}, user=${result.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Status notification failed: order=${result.orderId}, user=${result.userId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
    console.log('order', result.to);
    console.log('order status', OrderStatus.CONFIRMED);
    console.log(GoshipConfig.autoCreate);
    // Auto-create shipment via GOSHIP when order is confirmed
    if (result.to === OrderStatus.CONFIRMED && GoshipConfig.autoCreate) {
      console.log(
        'Attempting to auto-create shipment via GOSHIP for order',
        result.orderId,
      );
      try {
        const order = await this.getOne(result.orderId);
        const recipientAddress = {
          name: order.recipientName || '',
          phone: String(order.recipientPhone || ''),
          street: order.detailAddress || '',
          city: String(order.province || ''),
          district: String(order.district || ''),
          ward: String(order.commune || ''),
        };

        const shipperAddress = {
          name: GoshipConfig.shipper.name,
          phone: GoshipConfig.shipper.phone,
          street: GoshipConfig.shipper.street,
          city: GoshipConfig.shipper.city,
          district: GoshipConfig.shipper.district,
          ward: GoshipConfig.shipper.ward,
        };
        console.log('GoshipConfig:', GoshipConfig);
        console.log('Shipper address:', shipperAddress);
        if (
          !shipperAddress.name ||
          !shipperAddress.phone ||
          !shipperAddress.street ||
          !shipperAddress.city ||
          !shipperAddress.district ||
          !shipperAddress.ward
        ) {
          throw new HttpException(
            'Missing GOSHIP shipper config (name/phone/street/city/district/ward)',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (
          !recipientAddress.name ||
          !recipientAddress.phone ||
          !recipientAddress.street ||
          !recipientAddress.city ||
          !recipientAddress.district ||
          !recipientAddress.ward
        ) {
          throw new HttpException(
            'Order recipient address is incomplete for GOSHIP shipment creation',
            HttpStatus.BAD_REQUEST,
          );
        }

        const parcel = {
          cod:
            order.paymentMethod === PaymentMethod.COD
              ? Number(order.totalAmount || 0)
              : 0,
          amount: Number(order.totalAmount || 0),
          weight: GoshipConfig.parcelDefaults.weight,
          width: GoshipConfig.parcelDefaults.width,
          height: GoshipConfig.parcelDefaults.height,
          length: GoshipConfig.parcelDefaults.length,
          metadata: `Order #${order.id}`,
        };
        console.log('Creating GOSHIP shipment with data:', {
          addressFrom: shipperAddress,
          addressTo: recipientAddress,
          parcel,
        });
        const rates = await GoshipClient.getRates({
          addressFrom: shipperAddress,
          addressTo: recipientAddress,
          parcel,
        });

        if (!rates.length) {
          throw new HttpException(
            'No GOSHIP rates available for this route',
            HttpStatus.BAD_REQUEST,
          );
        }

        const selectedRate = order.shippingRateId
          ? (rates.find((rate) => rate.id === order.shippingRateId) ?? null)
          : rates[0];

        if (!selectedRate) {
          throw new HttpException(
            'Selected GOSHIP rate is no longer available for this order',
            HttpStatus.BAD_REQUEST,
          );
        }

        // Determine who pays for shipping in GOSHIP:
        // - If COD -> shop pays (0)
        // - If MOMO and payment completed -> shop pays (0) (per product requirement)
        // - Otherwise default to customer pays (1)
        let payer: 0 | 1 = 1;
        try {
          if (order.paymentMethod === PaymentMethod.COD) {
            payer = 0;
          } else if (order.paymentMethod === PaymentMethod.MOMO) {
            const payment = await this.paymentRepository.findOne({
              where: { orderId: order.id },
            });
            if (payment && payment.status === PaymentStatus.COMPLETED) {
              payer = 0; // shop pays when MOMO already completed
            } else {
              payer = 1;
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to resolve payment for order=${order.id}, defaulting payer=1`, e instanceof Error ? e.stack : String(e));
          payer = 1;
        }

        // Step 2: create shipment using selected rate id
        const res = await GoshipClient.createShipment({
          rateId: selectedRate.id,
          payer,
          addressFrom: shipperAddress,
          addressTo: recipientAddress,
          parcel,
          idempotencyKey: String(order.id),
        });

        const trackingCode =
          res?.data?.carrier_code ||
          res?.data?.tracking_number ||
          res?.data?.trackingCode ||
          res?.data?.tracking ||
          res?.data?.tracking_code ||
          res?.carrier_code ||
          res?.tracking_number ||
          res?.trackingCode ||
          res?.tracking ||
          res?.tracking_code ||
          null;

        const providerShipmentId =
          res?.data?.id ||
          res?.data?.shipmentId ||
          res?.id ||
          res?.shipmentId ||
          null;

        // store shipment record
        await this.shipmentsService.createForOrder(order.id, {
          shipmentProvider: 'GOSHIP',
          shipmentId: providerShipmentId,
          trackingCode,
          trackingUrl: res?.data?.tracking_url || res?.tracking_url || null,
          carrierName:
            res?.data?.carrier ||
            res?.carrier ||
            selectedRate.carrier_name ||
            null,
          shippingService:
            selectedRate.service ||
            res?.data?.service ||
            res?.service ||
            null,
          shippingFee: Number(
            order.shippingRateFee ||
              selectedRate.total_fee ||
              res?.data?.fee ||
              res?.fee ||
              0,
          ),
          shipmentStatus: String(
            res?.data?.status || res?.status || 'created',
          ),
          shipmentStatusCode: Number(
            res?.data?.shipment_status || res?.shipment_status || 901,
          ),
          shipmentMeta: {
            rate: selectedRate,
            orderShippingRateId: order.shippingRateId,
            createShipmentResponse: res,
          },
        });

        // notify customer about tracking
        try {
          await this.notificationService.create({
            userId: result.userId,
            type: NotificationType.ORDER,
            title: `Đơn hàng #${order.id} - Vận đơn đã được tạo`,
            message: `Mã vận đơn: ${trackingCode || 'đang cập nhật'}`,
            referenceId: order.id,
          });
        } catch (e) {
          this.logger.error(
            'Failed to send shipment notification',
            e instanceof Error ? e.stack : undefined,
          );
        }
      } catch (err) {
        this.logger.error(
          `Auto-create shipment failed for order=${result.orderId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    if (result.to === OrderStatus.CANCELED) {
      try {
        await this.shipmentsService.cancelShipmentForOrder(result.orderId);
      } catch (err) {
        this.logger.error(
          `Failed to cancel shipment for order=${result.orderId}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return { message: result.message, from: result.from, to: result.to };
  }

  async ensureOrderOwnership(orderId: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (order.user.id !== userId) {
      throw new HttpException(
        'Forbidden: You can only cancel your own orders',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async userConfirmDelivery(orderId: number, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['user'],
      });

      if (!order)
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      if (order.user.id !== userId)
        throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      if (order.status === OrderStatus.DELIVERED) {
        return; // Đã được webhook cập nhật thành công, không cần ném lỗi
      }

      if (
        order.status !== OrderStatus.OUT_FOR_DELIVERY &&
        order.status !== OrderStatus.IN_TRANSIT
      ) {
        throw new HttpException(
          'Order must be in SHIPPING status to confirm',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Update trạng thái
      order.status = OrderStatus.DELIVERED;
      order.updatedAt = new Date();
      await manager.save(order);
    });
  }
}

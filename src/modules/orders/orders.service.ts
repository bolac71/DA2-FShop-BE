import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Address, Cart, CartItem, Coupon, CouponRedemption, Inventory, InventoryTransaction, Order, OrderItem, ProductVariant, User } from 'src/entities';
import { Brackets, DataSource, FindOptionsWhere, In, Like, Repository } from 'typeorm';
import { CreateOrderDto } from './dtos/create-order.dto';
import { CouponStatus, CouponType, NotificationType, RedemptionStatus, ShippingMethod } from 'src/constants';
import { OrderStatus } from 'src/constants/order-status.enum';
import { InventoryType } from 'src/constants/inventory-type.enum';
import { OrderQueryDto } from 'src/dtos';
import { ActorRole, ensureTransitionAllowed } from 'src/utils/order-status.rules';
import { InventoriesModule } from '../inventories/inventories.module';
import { InventoriesService } from '../inventories/inventories.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Livestream, LivestreamOrder } from '../livestreams/entities';
import { LivestreamStatus } from 'src/constants/livestream-status.enum';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoriesService: InventoriesService,
    private notificationService: NotificationsService
  ) { }

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

  private calculateCouponDiscount(coupon: Coupon, subtotal: number, shippingFee: number) {
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
      [OrderStatus.PROCESSING]: 'đang xử lý',
      [OrderStatus.SHIPPED]: 'đang giao',
      [OrderStatus.DELIVERED]: 'đã giao',
      [OrderStatus.CANCELED]: 'đã hủy',
      [OrderStatus.RETURN_REQUESTED]: 'đã yêu cầu trả hàng',
      [OrderStatus.RETURNED]: 'đã trả hàng',
      [OrderStatus.REFUNDED]: 'đã hoàn tiền',
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
    this.logger.log(`Create order start: user=${userId}, address=${createOrderDto.addressId}, items=${createOrderDto.items.length}`);

    const createdOrder = await this.dataSource.manager.transaction(async (manager) => {
      // Implementation for creating order within a transaction
      const { addressId, couponId, note, shippingMethod, items } = createOrderDto;

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
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      const address = await manager.findOne(Address, { where: { id: addressId, user: { id: userId } } });
      if (!address) throw new HttpException('Address not found', HttpStatus.NOT_FOUND);

      // 2. Get cart with items
      const cart = await manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: ['items', 'items.variant', 'user', 'items.variant.product'],
      });

      // 3. Calculate shipping fee
      const shippingFee = this.calculateShippingFee(shippingMethod);

      // 4. Create order (without totalAmount first)
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
          relations: ['product'],
        })
        if (!variant) throw new HttpException(`Product variant with id ${item.variantId} not found`, HttpStatus.NOT_FOUND);
        if (!variant.product) throw new HttpException(`Product not found for variant ${item.variantId}`, HttpStatus.NOT_FOUND);

        const inventory = await manager.findOne(Inventory, {
          where: { variant: { id: item.variantId } },
        })
        if (!inventory) throw new HttpException(`Inventory not found for variant ${item.variantId}`, HttpStatus.NOT_FOUND);

        if (inventory.quantity < item.quantity) {
          throw new HttpException(`Insufficient stock for variant ${item.variantId}. Available: ${inventory.quantity}, Required: ${item.quantity}`, HttpStatus.BAD_REQUEST);
        }

        // Create order item
        const orderItem = manager.create(OrderItem, {
          order,
          variant,
          quantity: item.quantity,
          price: variant.product.price,
        });
        await manager.save(orderItem);
        subtotal += Number(variant.product.price) * item.quantity;
        orderedProductIds.push(variant.product.id);

        inventory.quantity -= item.quantity;
        await manager.save(inventory);

        const inventoryTransaction = manager.create(InventoryTransaction, {
          variantId: variant.id,
          userId,
          type: InventoryType.EXPORT,
          quantity: item.quantity,
          note: `Order #${order.id} - ${user.email}`,
        })
        await manager.save(inventoryTransaction);

        if (cart && cart.items.length > 0) {
          const cartItem = cart.items.find(
            (ci) => ci.variant.id === variant.id,
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

      let discountAmount = 0;

      if (couponId) {
        const coupon = await manager.findOne(Coupon, { where: { id: couponId, isActive: true } });
        if (!coupon) {
          throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
        }

        const now = new Date();
        if (coupon.status !== CouponStatus.ACTIVE || now < new Date(coupon.startDate) || now > new Date(coupon.endDate)) {
          throw new HttpException('Coupon is not active', HttpStatus.BAD_REQUEST);
        }

        if (Number(coupon.maxUses) > 0 && Number(coupon.usedCount) >= Number(coupon.maxUses)) {
          throw new HttpException('Coupon has reached maximum uses', HttpStatus.BAD_REQUEST);
        }

        if (subtotal < Number(coupon.minOrderAmount)) {
          throw new HttpException('Order does not meet coupon minimum amount', HttpStatus.BAD_REQUEST);
        }

        if (coupon.applicableProduct && !orderedProductIds.includes(coupon.applicableProduct)) {
          throw new HttpException('Coupon is not applicable to selected products', HttpStatus.BAD_REQUEST);
        }

        if (Number(coupon.perUserLimit) > 0) {
          const redeemedCount = await manager.count(CouponRedemption, {
            where: {
              couponId: coupon.id,
              userId,
              status: In([RedemptionStatus.APPLIED, RedemptionStatus.REDEEMED]),
            },
          });

          if (redeemedCount >= Number(coupon.perUserLimit)) {
            throw new HttpException('Coupon has reached per-user limit', HttpStatus.BAD_REQUEST);
          }
        }

        discountAmount = this.calculateCouponDiscount(coupon, subtotal, shippingFee);

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

      order.totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);
      await manager.save(order);

      if (createOrderDto.livestreamId) {
        const livestreamOrder = manager.create(LivestreamOrder, {
          livestreamId: createOrderDto.livestreamId,
          orderId: order.id,
        });
        await manager.save(livestreamOrder);
      }

      
      return order
    });

    this.logger.log(`Create order committed: order=${createdOrder.id}, user=${userId}, total=${createdOrder.totalAmount}`);

    try {
      this.logger.log(`Trigger order notification: order=${createdOrder.id}, user=${userId}`);
      await this.notificationService.create({
        userId,
        type: NotificationType.ORDER,
        title: `Đặt hàng #${createdOrder.id} thành công`,
        message: `Đơn hàng #${createdOrder.id} đã được tạo. Vui lòng theo dõi trạng thái trong mục Đơn hàng của tôi.`,
      });
      this.logger.log(`Order notification success: order=${createdOrder.id}, user=${userId}`);
    } catch (error) {
      this.logger.error(`Order notification failed: order=${createdOrder.id}, user=${userId}`, error instanceof Error ? error.stack : undefined);
    }

    return createdOrder;
  }

  async getMyOrders(userId: number, query: OrderQueryDto) {
    const { page, limit, sortBy = 'id', sortOrder = 'DESC', status, search } = query;
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
            .where('CAST(order.id AS CHAR) LIKE :search', { search: normalizedSearch })
            .orWhere('LOWER(order.recipientName) LIKE LOWER(:search)', { search: normalizedSearch })
            .orWhere('LOWER(order.detailAddress) LIKE LOWER(:search)', { search: normalizedSearch })
            .orWhere('LOWER(order.note) LIKE LOWER(:search)', { search: normalizedSearch })
            .orWhere('LOWER(product.name) LIKE LOWER(:search)', { search: normalizedSearch });
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
    const {
      page,
      limit,
      search,
      sortBy = 'id',
      sortOrder,
      status,
    } = query;
    const where: FindOptionsWhere<Order>[] = [];
    if (search) {
      where.push(
        { note: Like(`%${search}%`), ...(status && { status }) },
        { detailAddress: Like(`%${search}%`), ...(status && { status }) },
      );
    } else {
      where.push({ ...(status && { status }) });
    }
    const [data, total] = await this.orderRepository.findAndCount({
      where,
      relations: ['items', 'items.variant', 'user'],
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    });
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
      relations: [
        'items',
        'items.variant',
        'items.variant.product',
      ],
    });
    if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }

  async getOneForUser(userId: number, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: [
        'items',
        'items.variant',
        'items.variant.product',
      ],
    });
    if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }

  async updateStatus(orderId: number, next: OrderStatus, actor: { id: number, role: ActorRole, reason?: string }) {
    this.logger.log(`Update order status start: order=${orderId}, actor=${actor.id}, role=${actor.role}, target=${next}`);

    const result = await this.dataSource.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['items', 'items.variant', 'user'],
      })
      if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);

      try {
        ensureTransitionAllowed(order.status, next, actor.role);
      }
      catch (e) {
        throw new HttpException(String(e), HttpStatus.BAD_REQUEST);
      }

      // Handle CANCELED status - restore stock and remove coupon redemption
      if (next === OrderStatus.CANCELED || next === OrderStatus.REFUNDED) {
        const inventoryItems: { variant: ProductVariant; quantity: number }[] = [];

        for (const it of order.items) {
          const variant = await manager
            .createQueryBuilder(ProductVariant, 'variant')
            .innerJoinAndSelect('variant.product', 'product')
            .where('variant.id = :id', { id: it.variant.id })
            .setLock('pessimistic_write')
            .getOne();

          if (!variant) throw new HttpException('Product variant not found', HttpStatus.NOT_FOUND);

          const inventory = await manager.findOne(Inventory, {
            where: { variant: { id: it.variant.id } },
          })
          if (!inventory) throw new HttpException(`Inventory not found for variant ${it.variant.id}`, HttpStatus.NOT_FOUND);

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
            const inventoryTransaction = manager.create(InventoryTransaction, {
              variantId: item.variant.id,
              userId: actor.id,
              type: InventoryType.RETURN,
              quantity: item.quantity,
              note: reasonNote,
            });
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
    });

    this.logger.log(`Update order status committed: order=${result.orderId}, from=${result.from}, to=${result.to}`);

    const notificationPayload = this.buildOrderStatusNotification(
      result.orderId,
      result.from,
      result.to,
      actor.role,
    );

    if (notificationPayload) {
      try {
        this.logger.log(`Trigger status notification: order=${result.orderId}, user=${result.userId}`);
        await this.notificationService.create({
          userId: result.userId,
          type: NotificationType.ORDER,
          title: notificationPayload.title,
          message: notificationPayload.message,
        });
        this.logger.log(`Status notification success: order=${result.orderId}, user=${result.userId}`);
      } catch (error) {
        this.logger.error(
          `Status notification failed: order=${result.orderId}, user=${result.userId}`,
          error instanceof Error ? error.stack : undefined,
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

      if (order.status !== OrderStatus.SHIPPED) {
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

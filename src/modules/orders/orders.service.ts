import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Address, Cart, CartItem, Inventory, InventoryTransaction, Order, OrderItem, ProductVariant, User } from 'src/entities';
import { DataSource, FindOptionsWhere, In, Like, Repository } from 'typeorm';
import { CreateOrderDto } from './dtos/create-order.dto';
import { ShippingMethod } from 'src/constants/shipping-method.enum';
import { OrderStatus } from 'src/constants/order-status.enum';
import { InventoryType } from 'src/constants/inventory-type.enum';
import { OrderQueryDto } from 'src/dtos';
import { ActorRole, ensureTransitionAllowed } from 'src/utils/order-status.rules';
import { InventoriesModule } from '../inventories/inventories.module';
import { InventoriesService } from '../inventories/inventories.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly inventoriesService: InventoriesService,
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

  async create(userId: number, createOrderDto: CreateOrderDto) {
    return await this.dataSource.manager.transaction(async (manager) => {
      // Implementation for creating order within a transaction
      const {addressId, note, shippingMethod, items} = createOrderDto;

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
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const variant = await manager.findOne(ProductVariant, {
          where: {id: item.variantId},
          relations: ['product'],
        })
        if (!variant) throw new HttpException(`Product variant with id ${item.variantId} not found`, HttpStatus.NOT_FOUND);

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
          price: variant.price,
        });
        await manager.save(orderItem);
        totalAmount += variant.price * item.quantity;

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

      order.totalAmount = totalAmount + shippingFee;
      await manager.save(order);
      return order
    });
  }

  async getMyOrders(userId: number, query: OrderQueryDto) {
    const { page, limit, sortBy = 'id', sortOrder = 'DESC', status } = query;
    const [data, total] = await this.orderRepository.findAndCount({
      where: {
        user: { id: userId },
        ...(status && { status }),
      },
      relations: [
        'items',
        'items.variant',
        'items.variant.product',
      ],
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
    });

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

  async updateStatus(orderId: number, next: OrderStatus, actor: {id: number, role: ActorRole, reason?: string}) {
    return this.dataSource.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId},
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
        const inventoryItems: {variant: ProductVariant; quantity: number}[] = [];
        
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
          inventoryItems.push({variant, quantity: it.quantity});
        }

        if (inventoryItems.length > 0) {
          const reasonNote =
            next === OrderStatus.CANCELED
              ? `Return products for shop for order #${order.id}`
              : `Return products for order #${order.id}`;

            for (const item of inventoryItems) {
              await this.inventoriesService.createTransaction(
                actor.id,
                {
                  variantId: item.variant.id,
                  type: InventoryType.RETURN,
                  quantity: item.quantity,
                  note: reasonNote,
                },
              );
            }
        }
      }

      const prev = order.status;
      order.status = next;
      await manager.save(order);

      return { message: 'Order status updated', from: prev, to: next };
    })
  }
}

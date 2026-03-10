import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Address, Cart, CartItem, Inventory, InventoryTransaction, Order, OrderItem, ProductVariant, User } from 'src/entities';
import { DataSource, In, Repository } from 'typeorm';
import { CreateOrderDto } from './dtos/create-order.dto';
import { ShippingMethod } from 'src/constants/shipping-method.enum';
import { OrderStatus } from 'src/constants/order-status.enum';
import { InventoryType } from 'src/constants/inventory-type.enum';
import { OrderQueryDto } from 'src/dtos';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem) 
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectDataSource() private readonly dataSource: DataSource,
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
}

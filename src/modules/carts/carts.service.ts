import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, ProductVariant, Inventory } from '../../entities';

import { Repository } from 'typeorm';
import { CreateCartDto, CartItemDto } from './dtos';
import { Cart, CartItem } from './entities';
import { UserInteractionsService } from '../user-interactions/user-interactions.service';
import { InteractionType } from '../user-interactions/entities/user-interaction.entity';

@Injectable()
export class CartsService {
  constructor(
    @InjectRepository(Cart) private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepository: Repository<CartItem>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(ProductVariant) private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Inventory) private inventoryRepository: Repository<Inventory>,
    private readonly interactionsService: UserInteractionsService,
  ) { }

  async create(createCartDto: CreateCartDto) {
    const { userId } = createCartDto;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    if (user.cart) throw new HttpException('User already have cart', HttpStatus.CONFLICT);
    const cart = this.cartRepository.create({ user });
    return await this.cartRepository.save(cart);
  }

  async addToCart(cartId: number, cartItemDto: CartItemDto) {
    const { variantId, quantity } = cartItemDto;
    const cart = await this.cartRepository.findOne({ 
      where: { id: cartId }, 
      relations: ['items', 'items.variant', 'user'] 
    });
    if (!cart) throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
    const inventory = await this.inventoryRepository.findOne({ where: { variant: { id: variantId } } });
    if (!inventory) throw new HttpException('Inventory not found for this variant', HttpStatus.NOT_FOUND);

    const variant = await this.productVariantRepository.findOne({ 
      where: { id: variantId },
      relations: ['product']
    });
    if (!variant) throw new HttpException('Variant not found', HttpStatus.NOT_FOUND);
    if (quantity > inventory.quantity) throw new HttpException('Not enough quantity', HttpStatus.BAD_REQUEST);

    const existingCartItem = cart.items.find(item => item.variant.id === variantId);
    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      await this.cartItemRepository.save(existingCartItem);
    }
    else {
      const cartItem = this.cartItemRepository.create({
        quantity,
        cart,
        variant,
      })
      await this.cartItemRepository.save(cartItem);
    }
    console.log(`Added to cart: cart ${cartId}, variant ${variantId}, quantity ${quantity}`);
    // Record interaction
    if (cart.user && variant.product) {
console.log(`Recording add_to_cart interaction for user ${cart.user.id} and product ${variant.product.id}`);
      this.interactionsService.recordInteraction(
        cart.user.id,
        variant.product.id,
        InteractionType.ADD_TO_CART,
      ).catch(err => console.error('Failed to record add_to_cart interaction:', err));
    }

    return this.cartRepository.findOne({ where: { id: cart.id }, relations: ['items', 'items.variant'] });
  }

  async removeFromtCart(cartId: number, cartItemDto: CartItemDto) {
    const { variantId, quantity } = cartItemDto;
    const cart = await this.cartRepository.findOne({ where: { id: cartId }, relations: ['items', 'items.variant'] });

    if (!cart) throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
    const existingCartItem = cart.items.find(item => item.variant.id === variantId);
    if (!existingCartItem) throw new HttpException('Cart item not found', HttpStatus.NOT_FOUND);

    if (existingCartItem.quantity <= quantity) await this.cartItemRepository.remove(existingCartItem);
    else {
      existingCartItem.quantity -= quantity;
      await this.cartItemRepository.save(existingCartItem);
    }

    return this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.variant'],
    });
  }

  async getCart(cartId: number) {
    const cart = await this.cartRepository.findOne({ where: { id: cartId }, relations: ['items', 'items.variant', 'items.variant.product'] });
    if (!cart) throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
    return cart;
  }
}

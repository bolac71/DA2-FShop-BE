import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Cart,
  Inventory,
  Outfit,
  OutfitItem,
  Product,
  ProductVariant,
  User,
} from 'src/entities';
import { Repository } from 'typeorm';
import { CartsService } from '../carts/carts.service';
import { CreateOutfitDto, OutfitItemDto, UpdateOutfitDto } from './dtos';

@Injectable()
export class OutfitsService {
  constructor(
    @InjectRepository(Outfit) private outfitRepo: Repository<Outfit>,
    @InjectRepository(OutfitItem) private outfitItemRepo: Repository<OutfitItem>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepo: Repository<ProductVariant>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    private readonly cartsService: CartsService,
  ) {}

  async findMine(userId: number) {
    return this.outfitRepo.find({
      where: { user: { id: userId } },
      relations: this.outfitRelations(),
      order: { updatedAt: 'DESC' },
    });
  }

  async findOneForUser(userId: number, outfitId: number) {
    const outfit = await this.outfitRepo.findOne({
      where: { id: outfitId, user: { id: userId } },
      relations: this.outfitRelations(),
    });
    if (!outfit) {
      throw new HttpException('Outfit not found', HttpStatus.NOT_FOUND);
    }
    return outfit;
  }

  async create(userId: number, dto: CreateOutfitDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    this.assertUniqueSlots(dto.items);
    const items = await this.buildItems(dto.items);
    const outfit = this.outfitRepo.create({
      name: dto.name.trim(),
      user,
      items,
    });
    const saved = await this.outfitRepo.save(outfit);
    return this.findOneForUser(userId, saved.id);
  }

  async update(userId: number, outfitId: number, dto: UpdateOutfitDto) {
    const outfit = await this.findOneForUser(userId, outfitId);

    if (dto.name !== undefined) {
      outfit.name = dto.name.trim();
    }

    if (dto.items !== undefined) {
      if (dto.items.length === 0) {
        throw new HttpException(
          'Outfit must contain at least one item',
          HttpStatus.BAD_REQUEST,
        );
      }
      this.assertUniqueSlots(dto.items);
      await this.outfitItemRepo.delete({ outfit: { id: outfit.id } });
      outfit.items = await this.buildItems(dto.items);
    }

    await this.outfitRepo.save(outfit);
    return this.findOneForUser(userId, outfit.id);
  }

  async remove(userId: number, outfitId: number) {
    const outfit = await this.findOneForUser(userId, outfitId);
    await this.outfitRepo.remove(outfit);
    return { deleted: true, id: outfitId };
  }

  async addToCart(userId: number, outfitId: number) {
    const outfit = await this.findOneForUser(userId, outfitId);
    if (!outfit.items?.length) {
      throw new HttpException('Outfit is empty', HttpStatus.BAD_REQUEST);
    }

    const cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!cart) {
      throw new HttpException('Cart not found', HttpStatus.NOT_FOUND);
    }

    let latestCart: unknown = null;
    for (const item of outfit.items) {
      if (!item.variant?.id) {
        throw new HttpException(
          'Every outfit item must have a selected variant',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.assertInventory(item.variant.id, item.quantity || 1);
      latestCart = await this.cartsService.addToCart(cart.id, {
        variantId: item.variant.id,
        quantity: item.quantity || 1,
      });
    }

    return latestCart;
  }

  private outfitRelations() {
    return [
      'items',
      'items.product',
      'items.product.images',
      'items.product.brand',
      'items.product.category',
      'items.variant',
      'items.variant.color',
      'items.variant.size',
    ];
  }

  private assertUniqueSlots(items: OutfitItemDto[]) {
    const slots = new Set<string>();
    for (const item of items) {
      if (slots.has(item.slot)) {
        throw new HttpException(
          'Each outfit slot can contain only one item',
          HttpStatus.BAD_REQUEST,
        );
      }
      slots.add(item.slot);
    }
  }

  private async buildItems(items: OutfitItemDto[]) {
    const outfitItems: OutfitItem[] = [];
    for (const item of items) {
      const product = await this.productRepo.findOne({
        where: { id: item.productId, isActive: true },
      });
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }

      const variant = await this.variantRepo.findOne({
        where: { id: item.variantId, productId: item.productId, isActive: true },
      });
      if (!variant) {
        throw new HttpException('Variant not found', HttpStatus.NOT_FOUND);
      }

      await this.assertInventory(variant.id, item.quantity || 1);
      outfitItems.push(
        this.outfitItemRepo.create({
          slot: item.slot,
          product,
          variant,
          quantity: item.quantity || 1,
          layout: item.layout || null,
        }),
      );
    }
    return outfitItems;
  }

  private async assertInventory(variantId: number, quantity: number) {
    const inventory = await this.inventoryRepo.findOne({
      where: { variant: { id: variantId } },
    });
    if (!inventory) {
      throw new HttpException(
        'Inventory not found for this variant',
        HttpStatus.NOT_FOUND,
      );
    }
    if (quantity > inventory.quantity) {
      throw new HttpException('Not enough quantity', HttpStatus.BAD_REQUEST);
    }
  }
}

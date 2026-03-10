import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inventory, InventoryTransaction } from './entities';
import { Repository } from 'typeorm';
import {
  CreateInventoryDto,
  CreateInventoryTransactionDto,
  UpdateInventoryDto,
} from './dtos';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { InventoryType } from '../../constants/inventory-type.enum';
import { User } from 'src/entities';

@Injectable()
export class InventoriesService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryTransaction)
    private transactionRepository: Repository<InventoryTransaction>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create or initialize inventory for a variant
   */
  async create(createInventoryDto: CreateInventoryDto) {
    const { variantId, quantity = 0 } = createInventoryDto;

    // Verify variant exists
    const variant = await this.productVariantRepository.findOne({
      where: { id: variantId, isActive: true },
    });
    if (!variant) 
      throw new HttpException('Product variant not found', HttpStatus.NOT_FOUND);
    

    // Check if inventory already exists for this variant
    const existingInventory = await this.inventoryRepository.findOne({
      where: { variantId },
    });
    if (existingInventory) 
      throw new HttpException('Inventory already exists for this variant', HttpStatus.CONFLICT);
    
    const inventory = this.inventoryRepository.create({
      variantId,
      quantity,
    });

    return await this.inventoryRepository.save(inventory);
  }

  /**
   * Get inventory by variant ID
   */
  async getByVariantId(variantId: number): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { variantId },
    });

    if (!inventory) {
      throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
    }

    return inventory;
  }

  /**
   * Get inventory by ID
   */
  async getById(id: number): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
    });

    if (!inventory) {
      throw new HttpException('Inventory not found', HttpStatus.NOT_FOUND);
    }

    return inventory;
  }

  /**
   * Get all inventories (for admin/dashboard)
   */
  async getAll(page?: number, limit?: number) {
    const [data, total] = await this.inventoryRepository.findAndCount({
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { createdAt: 'DESC' },
    });

    return { pagination: { total, page, limit }, data };
  }

  /**
   * Update inventory quantity directly (admin only)
   */
  async update(id: number, updateInventoryDto: UpdateInventoryDto): Promise<Inventory> {
    const inventory = await this.getById(id);

    if (updateInventoryDto.quantity !== undefined) {
      inventory.quantity = updateInventoryDto.quantity;
    }

    return await this.inventoryRepository.save(inventory);
  }

  /**
   * Record inventory transaction (import, export, return, adjustment)
   * Updates inventory quantity and creates transaction record
   */
  async createTransaction(userId: number, createTransactionDto: CreateInventoryTransactionDto) {
    const { variantId, type, quantity, note } = createTransactionDto;

    const user = await this.userRepository.findOne({ where: { id: userId, isActive: true } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    // Get current inventory
    let inventory = await this.inventoryRepository.findOne({
      where: { variantId },
    });

    // If inventory doesn't exist, create it
    if (!inventory) {
      inventory = this.inventoryRepository.create({ variantId, quantity: 0 });
      await this.inventoryRepository.save(inventory);
    }

    // Calculate new quantity
    let newQuantity = inventory.quantity;

    if (type === InventoryType.IMPORT) {
      newQuantity += quantity;
    } else if (type === InventoryType.EXPORT) {
      newQuantity -= quantity;
      // Prevent negative stock
      if (newQuantity < 0) {
        throw new HttpException(
          `Insufficient stock. Current: ${inventory.quantity}, Requested: ${quantity}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (type === InventoryType.RETURN) {
      newQuantity += quantity;
    } else if (type === InventoryType.ADJUSTMENT) {
      // ADJUSTMENT replaces current quantity
      newQuantity = quantity;
    }

    // Update inventory quantity
    inventory.quantity = newQuantity;
    await this.inventoryRepository.save(inventory);

    // Create transaction record
    const transaction = this.transactionRepository.create({
      variantId,
      userId,
      type,
      quantity,
      note,
    });

    return await this.transactionRepository.save(transaction);
  }

  /**
   * Get transaction history for a variant
   */
  async getTransactionHistory(variantId: number, page?: number, limit?: number) {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { variantId },
      relations: ['variant', 'user'],
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { createdAt: 'DESC' },
    });

    return { pagination: { total, page, limit }, data };
  }

  /**
   * Get inventory low stock alert (quantity below threshold)
   */
  async getLowStockInventories(threshold: number = 10){
    return await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.quantity <= :threshold', { threshold })
      .orderBy('inventory.quantity', 'ASC')
      .getMany();
  }

  /**
   * Delete inventory (soft delete by setting quantity to 0)
   */
  async delete(id: number): Promise<{ message: string; id: number }> {
    const inventory = await this.getById(id);
    await this.inventoryRepository.remove(inventory);
    return { message: 'Inventory deleted successfully', id };
  }
}

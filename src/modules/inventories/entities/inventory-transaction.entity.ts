import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { User } from '../../users/entities/user.entity';
import { Inventory } from './inventory.entity';
import { InventoryType } from '../../../constants/inventory-type.enum';
import { Exclude } from 'class-transformer';

@Entity('inventory_transactions')
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'variant_id', type: 'int', nullable: false })
  variantId: number;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number;

  @Column({ type: 'enum', enum: InventoryType })
  type: InventoryType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Inventory, (inventory) => inventory.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id', referencedColumnName: 'variantId' })
  @Exclude()
  inventory?: Inventory;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  @Exclude()
  variant?: ProductVariant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  @Exclude()
  user?: User;
}

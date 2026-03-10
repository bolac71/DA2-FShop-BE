import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariant } from '../../products/entities/product-variant.entity';
import { InventoryTransaction } from './inventory-transaction.entity';
import { Exclude } from 'class-transformer';

@Entity('inventories')
@Unique(['variantId'])
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'variant_id', type: 'int', nullable: false })
  variantId: number;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  @Exclude()
  variant?: ProductVariant;

  @OneToMany(() => InventoryTransaction, (transaction) => transaction.inventory)
  transactions?: InventoryTransaction[];
}

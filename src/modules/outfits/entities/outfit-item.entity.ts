import { Product } from 'src/modules/products/entities/product.entity';
import { ProductVariant } from 'src/modules/products/entities/product-variant.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Outfit } from './outfit.entity';
import { OutfitSlot } from './outfit-slot.enum';

export type OutfitItemLayout = {
  x?: number;
  y?: number;
  scale?: number;
  zIndex?: number;
};

@Entity('outfit_items')
@Unique(['outfit', 'slot'])
export class OutfitItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: OutfitSlot })
  slot: OutfitSlot;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'json', nullable: true })
  layout?: OutfitItemLayout | null;

  @ManyToOne(() => Outfit, (outfit) => outfit.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outfit_id' })
  outfit: Outfit;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;
}

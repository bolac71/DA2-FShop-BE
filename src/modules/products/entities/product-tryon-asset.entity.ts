import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';

export enum ProductTryonAssetType {
  GLASSES = 'glasses',
  HAT = 'hat',
  ACCESSORY = 'accessory',
}

@Entity('product_tryon_assets')
export class ProductTryonAsset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', type: 'int', nullable: false })
  productId: number;

  @Column({ name: 'variant_id', type: 'int', nullable: true })
  variantId?: number | null;

  @Column({ name: 'asset_type', type: 'varchar', length: 32, nullable: false })
  assetType: ProductTryonAssetType;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: false })
  displayName: string;

  @Column({ name: 'deepar_effect_url', type: 'text', nullable: false })
  deeparEffectUrl: string;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Product, (product) => product.tryonAssets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant | null;
}

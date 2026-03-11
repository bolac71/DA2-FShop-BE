import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductImage } from './product-image.entity';
import { ProductVariant } from './product-variant.entity';
import { Wishlist } from 'src/modules/wishlists/entities/wishlist.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'brand_id', type: 'int', nullable: false })
  brandId: number;

  @Column({ name: 'category_id', type: 'int', nullable: false })
  categoryId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand?: Brand;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images?: ProductImage[];

  @OneToMany(() => ProductVariant, (variant) => variant.product, { cascade: true })
  variants?: ProductVariant[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.product, { cascade: true })
  wishlists?: Wishlist[];
}

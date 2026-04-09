import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { Review } from 'src/modules/reviews/entities';
import { Product } from './product.entity';
import { Color } from '../../colors/entities/color.entity';
import { Size } from '../../sizes/entities/size.entity';
import { CartItem } from 'src/modules/carts/entities';
import { OrderItem } from 'src/modules/orders/entities';

@Entity('product_variants')
@Unique(['productId', 'colorId', 'sizeId'])
export class ProductVariant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl?: string;

  @Column({ name: 'public_id', type: 'varchar', nullable: true })
  publicId?: string;

  @Column({ type: 'varchar', nullable: true })
  sku?: string;

  @Column({ name: 'product_id', type: 'int', nullable: false })
  productId: number;

  @Column({ name: 'color_id', type: 'int', nullable: false })
  colorId: number;

  @Column({ name: 'size_id', type: 'int', nullable: false })
  sizeId: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Product, (product) => product.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  @ManyToOne(() => Color)
  @JoinColumn({ name: 'color_id' })
  color?: Color;

  @ManyToOne(() => Size)
  @JoinColumn({ name: 'size_id' })
  size?: Size;

  @OneToMany(() => CartItem, (cartItem) => cartItem.variant)
  cartItems: CartItem[];

  @OneToMany(() => OrderItem, orderItem => orderItem.variant)
  orderItems: OrderItem[];

  @OneToMany(() => Review, review => review.variant)
  reviews: Review[];
}

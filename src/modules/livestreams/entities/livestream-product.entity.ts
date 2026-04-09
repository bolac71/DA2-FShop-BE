import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Livestream } from './livestream.entity';
import { Product } from 'src/modules/products/entities/product.entity';

@Entity('livestream_products')
@Unique(['livestreamId', 'productId'])
export class LivestreamProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'livestream_id', type: 'int' })
  livestreamId: number;

  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ name: 'units_sold', type: 'int', default: 0 })
  unitsSold: number;

  @ManyToOne(() => Livestream, (livestream) => livestream.pinnedProducts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'livestream_id' })
  livestream: Livestream;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

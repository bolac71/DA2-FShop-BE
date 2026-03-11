/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { Product } from 'src/modules/products/entities/product.entity';

@Entity('wishlists')
export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.wishlists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  @Exclude()
  user: User;

  @ManyToOne(() => Product, (product) => product.wishlists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  @Exclude()
  product: Product;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

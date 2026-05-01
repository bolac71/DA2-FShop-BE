import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';


export enum InteractionType {
  VIEW = 'view',
  WISHLIST = 'wishlist',
  ADD_TO_CART = 'add_to_cart',
  PURCHASE = 'purchase',
}

@Entity('user_interactions')
export class UserInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: false })
  userId: number;

  @Column({ name: 'product_id', type: 'int', nullable: false })
  productId: number;

  @Column({
    name: 'interaction_type',
    type: 'enum',
    enum: InteractionType,
    default: InteractionType.VIEW,
  })
  interactionType: InteractionType;

  @Column({ name: 'score', type: 'float', default: 1.0 })
  score: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product?: Product;
}

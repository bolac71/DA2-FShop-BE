import { Exclude } from "class-transformer";
import { User } from "src/modules/users/entities/user.entity";
import { Order } from "src/modules/orders/entities/order.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { ReviewImage } from "./review-image.entity";
import { ReviewVote } from "./review-vote.entity";
import { ProductVariant } from "src/entities";

@Entity("reviews")
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false, name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'user_id' })
  @Exclude()
  user: User;

  @Column({ type: 'int', nullable: false, name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.reviews)
  @JoinColumn({ name: 'order_id' })
  @Exclude()
  order: Order;

  @Column({ type: 'int', nullable: false, name: 'variant_id' })
  variantId: number;

  @ManyToOne(() => ProductVariant, (variant) => variant.reviews)
  @JoinColumn({ name: 'variant_id' })
  @Exclude()
  variant: ProductVariant;

  @Column({ type: 'decimal', precision: 2, scale: 1, default: 5.0, name: 'rating' })
  rating: number;

  @Column({ type: 'text', nullable: true, name: 'comment' })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'flagged'],
    default: 'pending',
    name: 'moderation_status',
  })
  moderationStatus: 'pending' | 'approved' | 'flagged';

  @OneToMany(() => ReviewImage, (image) => image.review, { cascade: true })
  @Exclude()
  images: ReviewImage[];

  @OneToMany(() => ReviewVote, (vote) => vote.review)
  @Exclude()
  votes: ReviewVote[];
}
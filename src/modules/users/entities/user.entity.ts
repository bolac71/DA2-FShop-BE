import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Role } from '../../../constants/role.enum';
import { Address } from 'src/modules/addresses/entities/address.entity';
import { Wishlist } from 'src/modules/wishlists/entities/wishlist.entity';
import { Cart } from 'src/modules/carts/entities';
import { Order } from 'src/modules/orders/entities';
import { ReviewVote } from 'src/modules/reviews/entities/review-vote.entity';
import { Review } from 'src/modules/reviews/entities/review.entity';
import { Post, PostComment, PostLike } from 'src/modules/posts/entities';
import { Notification } from 'src/modules/notifications/entities/notification.entity';
import { DeviceToken } from 'src/modules/notifications/entities/device-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', nullable: false })
  @Exclude()
  password: string;

  @Column({ name: 'google_id', type: 'varchar', nullable: true, unique: true })
  googleId: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar: string;

  @Column({ name: 'public_id', type: 'varchar', nullable: true })
  @Exclude()
  publicId: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Address, (address) => address.user, { cascade: ['soft-remove'] })
  @Exclude()
  addresses: Address[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user, { cascade: true })
  @Exclude()
  wishlists: Wishlist[];

  @OneToOne(() => Cart, (cart) => cart.user, { cascade: true })
  @Exclude()
  cart: Cart;

  @OneToMany(() => Order, order => order.user)
  @Exclude()
  orders: Order[];

  @OneToMany(() => Review, review => review.user)
  @Exclude()
  reviews: Review[];

  @OneToMany(() => ReviewVote, (vote) => vote.user)
  @Exclude()
  reviewVotes: ReviewVote[];

  @OneToMany(() => Post, post => post.user)
  @Exclude()
  posts: Post[];

  @OneToMany(() => PostLike, (like) => like.user)
  @Exclude()
  postLikes: PostLike[];

  @OneToMany(() => PostComment, (comment) => comment.user)
  @Exclude()
  postComments: PostComment[];

  @OneToMany(() => Notification, (notification) => notification.user)
  @Exclude()
  notifications: Notification[];

  @OneToMany(() => DeviceToken, (deviceToken) => deviceToken.user)
  @Exclude()
  deviceTokens: DeviceToken[];
}

import { RedemptionStatus } from "src/constants";
import { User, Order } from "src/entities";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Coupon } from "./coupon.entity";
import { Exclude } from "class-transformer";

@Entity('coupon_redemptions')
export class CouponRedemption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'coupon_id', type: 'integer' })
  couponId: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Column({ name: 'order_id', type: 'integer' })
  orderId: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @Column({ type: 'enum', enum: RedemptionStatus, nullable: false, default: RedemptionStatus.APPLIED })
  status: RedemptionStatus;

  // Relations
  @ManyToOne(() => Coupon, (coupon) => coupon.redemptions)
  @JoinColumn({ name: 'coupon_id' })
  @Exclude()
  coupon: Coupon;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  @Exclude()
  user: User;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  @Exclude()
  order: Order;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
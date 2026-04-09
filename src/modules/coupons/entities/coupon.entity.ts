import { CouponStatus, CouponType } from "src/constants";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CouponRedemption } from "./coupon-redemption.entity";

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CouponType, nullable: false, default: CouponType.FIXED })
  type: CouponType

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  value: number;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  minOrderAmount: number;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  maxDiscountAmount: number;

  @Column({ name: 'max_uses', type: 'integer', default: 0, nullable: false })
  maxUses: number;

  @Column({ name: 'per_user_limit', type: 'integer', default: 0 })
  perUserLimit: number;

  @Column({ name: 'used_count', type: 'integer', default: 0 })
  usedCount: number;

  @Column({name: 'applicable_product', type: 'integer', nullable: true })
  applicableProduct: number;

  @Column({ name: 'start_date', type: 'timestamp', nullable: false })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp', nullable: false })
  endDate: Date;

  @Column({ type: 'enum', enum: CouponStatus, nullable: false, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Column({ type: 'boolean', default: true, name: 'is_public' })
  isPublic: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Reverse relation - để query redemptions của coupon
  @OneToMany(() => CouponRedemption, (redemption) => redemption.coupon)
  redemptions: CouponRedemption[];
}
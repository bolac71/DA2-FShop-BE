import { Exclude } from "class-transformer";
import { OrderStatus } from "src/constants/order-status.enum";
import { ShippingMethod } from "src/constants/shipping-method.enum";
import { PaymentMethod } from "src/constants/payment-method.enum";
import { User } from "src/entities";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderItem } from ".";
import { Review } from "src/modules/reviews/entities/review.entity";

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, name: 'recipient_name' })
  recipientName: string;

  @Column({ nullable: true, name: 'detail_address' })
  detailAddress: string;

  @Column({ name: 'province', nullable: true })
  province: string;

  @Column({ name: 'district', nullable: true })
  district: string;

  @Column({ name: 'commune', nullable: true })
  commune: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount', default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true, name: 'note' })
  note: string;

  @Column({
    type: 'enum',
    enum: ShippingMethod,
    default: ShippingMethod.STANDARD,
    name: 'shipping_method',
  })
  shippingMethod: ShippingMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'shipping_fee' })
  shippingFee: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  @Exclude()
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  @OneToMany(() => Review, (review) => review.order)
  reviews: Review[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
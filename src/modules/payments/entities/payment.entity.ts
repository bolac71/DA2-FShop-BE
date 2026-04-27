import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentMethod } from 'src/constants/payment-method.enum';
import { PaymentStatus } from 'src/constants/payment-status.enum';
import { User } from 'src/entities';
import { Order } from 'src/modules/orders/entities/order.entity';
import { PaymentRetry } from './payment-retry.entity';
import { Exclude } from 'class-transformer';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.MOMO,
  })
  method: PaymentMethod;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'external_transaction_id',
  })
  externalTransactionId: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
    name: 'request_id',
  })
  requestId: string;

  @Column({
    type: 'integer',
    default: 0,
    name: 'retry_count',
  })
  retryCount: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  @Exclude()
  order: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  @Exclude()
  user: User;

  @OneToMany(() => PaymentRetry, (retry) => retry.payment)
  retries: PaymentRetry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { Exclude } from 'class-transformer';

@Entity('payment_retries')
export class PaymentRetry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'payment_id' })
  paymentId: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  reason: string;

  @Column({
    name: 'attempted_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  attemptedAt: Date;

  @Column({
    type: 'varchar',
    nullable: true,
    name: 'response_code',
  })
  responseCode: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'response_message',
  })
  responseMessage: string;

  @ManyToOne(() => Payment, (payment) => payment.retries)
  @JoinColumn({ name: 'payment_id' })
  @Exclude()
  payment: Payment;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

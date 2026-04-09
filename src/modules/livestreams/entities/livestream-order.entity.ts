import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Livestream } from './livestream.entity';
import { Order } from 'src/modules/orders/entities';

@Entity('livestream_orders')
export class LivestreamOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'livestream_id', type: 'int' })
  livestreamId: number;

  @Column({ name: 'order_id', type: 'int', unique: true })
  orderId: number;

  @ManyToOne(() => Livestream, (livestream) => livestream.livestreamOrders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'livestream_id' })
  livestream: Livestream;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

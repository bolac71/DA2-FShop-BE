import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from 'src/modules/orders/entities/order.entity';

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'shipment_provider', type: 'varchar' })
  shipmentProvider: string;

  @Column({ name: 'shipment_id', type: 'varchar', nullable: true })
  shipmentId: string;

  @Column({ name: 'tracking_code', type: 'varchar', nullable: true })
  trackingCode: string;

  @Column({ name: 'tracking_url', type: 'varchar', nullable: true })
  trackingUrl: string;

  @Column({ name: 'carrier_name', type: 'varchar', nullable: true })
  carrierName: string;

  @Column({ name: 'shipping_service', type: 'varchar', nullable: true })
  shippingService: string;

  @Column({
    name: 'shipping_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  shippingFee: number;

  @Column({ name: 'shipment_status', type: 'varchar', nullable: true })
  shipmentStatus: string;

  @Column({ name: 'shipment_status_code', type: 'int', nullable: true })
  shipmentStatusCode: number;

  @Column({ name: 'shipment_meta', type: 'json', nullable: true })
  shipmentMeta: any;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

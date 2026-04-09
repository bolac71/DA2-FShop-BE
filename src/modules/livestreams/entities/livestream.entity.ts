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
import { User } from 'src/modules/users/entities/user.entity';
import { LivestreamStatus } from 'src/constants';
import { LivestreamProduct } from './livestream-product.entity';
import { LivestreamComment } from './livestream-comment.entity';
import { LivestreamOrder } from './livestream-order.entity';

@Entity('livestreams')
export class Livestream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'host_id', type: 'int' })
  hostId: number;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'cover_image_url', type: 'varchar', nullable: true })
  coverImageUrl?: string;

  @Column({ name: 'cover_image_public_id', type: 'varchar', nullable: true })
  coverImagePublicId?: string;

  @Column({ name: 'agora_channel', type: 'varchar', unique: true, nullable: false })
  agoraChannel: string;

  @Column({
    type: 'enum',
    enum: LivestreamStatus,
    default: LivestreamStatus.SCHEDULED,
  })
  status: LivestreamStatus;

  @Column({ name: 'scheduled_start_at', type: 'timestamp' })
  scheduledStartAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ name: 'viewer_count', type: 'int', default: 0 })
  viewerCount: number;

  @Column({ name: 'total_viewers', type: 'int', default: 0 })
  totalViewers: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @OneToMany(() => LivestreamProduct, (livestreamProduct) => livestreamProduct.livestream)
  pinnedProducts: LivestreamProduct[];

  @OneToMany(() => LivestreamComment, (livestreamComment) => livestreamComment.livestream)
  comments: LivestreamComment[];

  @OneToMany(() => LivestreamOrder, (livestreamOrder) => livestreamOrder.livestream)
  livestreamOrders: LivestreamOrder[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

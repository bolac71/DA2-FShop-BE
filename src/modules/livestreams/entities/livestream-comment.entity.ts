import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Livestream } from './livestream.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('livestream_comments')
export class LivestreamComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'livestream_id', type: 'int' })
  livestreamId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({ name: 'like_count', type: 'int', default: 0 })
  likeCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Livestream, (livestream) => livestream.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'livestream_id' })
  livestream: Livestream;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

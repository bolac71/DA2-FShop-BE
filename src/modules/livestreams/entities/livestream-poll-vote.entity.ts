import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LivestreamPoll } from './livestream-poll.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('livestream_poll_votes')
export class LivestreamPollVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'poll_id', type: 'int' })
  pollId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'option_index', type: 'int' })
  optionIndex: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => LivestreamPoll, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poll_id' })
  poll: LivestreamPoll;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}

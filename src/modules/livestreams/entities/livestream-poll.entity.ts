import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Livestream } from './livestream.entity';

export type PollResult = {
  optionIndex: number;
  text: string;
  count: number;
  percentage: number;
};

@Entity('livestream_polls')
export class LivestreamPoll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'livestream_id', type: 'int' })
  livestreamId: number;

  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'jsonb' })
  options: string[];

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'closed';

  @Column({ name: 'total_votes', type: 'int', default: 0 })
  totalVotes: number;

  @Column({ type: 'jsonb', nullable: true })
  results: PollResult[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @ManyToOne(() => Livestream, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'livestream_id' })
  livestream: Livestream;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiChatSession } from './ai-chat-session.entity';

export type AiChatMessageRole = 'user' | 'assistant';

@Entity('ai_chat_messages')
export class AiChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => AiChatSession, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: AiChatSession;

  @Column({ type: 'enum', enum: ['user', 'assistant'], name: 'role' })
  role!: AiChatMessageRole;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  products!: unknown[] | null;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

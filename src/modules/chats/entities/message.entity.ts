import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from 'src/modules/users/entities/user.entity';

export type AttachmentType = 'image' | 'voice' | 'video';

export interface MessageAttachment {
  type: AttachmentType;
  url: string;
  publicId: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  format?: string;
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conversation)
  conversation: Conversation;

  @ManyToOne(() => User)
  sender: User;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    name: 'sender_role',
  })
  senderRole: 'user' | 'admin';

  @Column('text', { nullable: true, name: 'content' })
  content: string | null;

  @Column('jsonb', { nullable: true, name: 'attachments' })
  attachments: MessageAttachment[] | null;

  @Column({ default: false, name: 'is_delivered' })
  isDelivered: boolean;

  @Column({ default: false, name: 'is_seen' })
  isSeen: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

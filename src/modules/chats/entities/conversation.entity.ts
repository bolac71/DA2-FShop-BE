import { User } from 'src/modules/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Unique,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('conversation')
@Unique(['customer'])
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_admin_id' })
  assignedAdmin?: User;

  @Column({ default: 'OPEN' })
  status: 'OPEN' | 'HANDLING';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'last_message_at' })
  lastMessageAt: Date;
}

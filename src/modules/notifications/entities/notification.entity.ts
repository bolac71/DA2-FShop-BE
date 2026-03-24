import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, JoinColumn } from 'typeorm';
import { User } from 'src/modules/users/entities/user.entity';
import { NotificationType } from 'src/constants';

@Entity('notifications')
@Index(['user', 'isRead', 'createdAt'])
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({
        type: 'enum',
        enum: NotificationType,
      })
    type: NotificationType;

    @Column({ default: false, nullable: false })
    isRead: boolean;

    @ManyToOne(() => User, (user) => user.notifications, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

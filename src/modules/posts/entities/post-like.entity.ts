import { Exclude } from 'class-transformer';
import { User } from 'src/modules/users/entities/user.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { Post } from './post.entity';

@Index('idx_post_likes_post_id', ['postId'])
@Index('idx_post_likes_user_id', ['userId'])
@Index('idx_post_likes_created_at', ['createdAt'])
@Entity('post_likes')
@Unique(['postId', 'userId'])
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false, name: 'post_id' })
  @Exclude()
  postId: number;

  @Column({ type: 'int', nullable: false, name: 'user_id' })
  @Exclude()
  userId: number;

  @ManyToOne(() => Post, (post) => post.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  @Exclude()
  post: Post;

  @ManyToOne(() => User, (user) => user.postLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { User } from 'src/modules/users/entities/user.entity';
import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Post } from './post.entity';

@Index('idx_post_comments_post_id', ['postId'])
@Index('idx_post_comments_user_id', ['userId'])
@Index('idx_post_comments_parent_comment_id', ['parentCommentId'])
@Index('idx_post_comments_created_at', ['createdAt'])
@Index('idx_post_comments_is_active', ['isActive'])
@Entity('post_comments')
export class PostComment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false, name: 'user_id' })
  @Exclude()
  userId: number;

  @ManyToOne(() => User, (user) => user.postComments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', nullable: false, name: 'post_id' })
  @Exclude()
  postId: number;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  @Exclude()
  post: Post;

  @Column({ type: 'text' })
  content: string;

  // Threaded comments support (unlimited depth - Reddit/Facebook style)
  @Column({ type: 'int', nullable: true, name: 'parent_comment_id' })
  @Exclude()
  parentCommentId: number | null;

  @ManyToOne(() => PostComment, (comment) => comment.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_comment_id' })
  @Exclude()
  parentComment: PostComment | null;

  @OneToMany(() => PostComment, (comment) => comment.parentComment)
  replies: PostComment[];

  @Column({ type: 'int', default: 0, name: 'reply_count' })
  replyCount: number;

  @Column({ type: 'int', default: 0, name: 'depth' })
  depth: number; // 0 = root comment, 1+ = nested replies (auto-calculated)

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

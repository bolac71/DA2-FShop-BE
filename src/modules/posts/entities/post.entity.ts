import { User } from 'src/modules/users/entities/user.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { PostImage } from './post-image.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';
import { PostHashtag } from './post-hashtag.entity';

@Index('idx_posts_user_id', ['userId'])
@Index('idx_posts_created_at', ['createdAt'])
@Index('idx_posts_is_active', ['isActive'])
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'int', nullable: false, name: 'user_id' })
  @Exclude()
  userId: number;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 0, name: 'total_likes' })
  totalLikes: number;

  @Column({ type: 'int', default: 0, name: 'total_comments' })
  totalComments: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => PostImage, (image) => image.post, { cascade: true })
  images: PostImage[];

  @OneToMany(() => PostLike, (like) => like.post)
  @Exclude()
  likes: PostLike[];

  @OneToMany(() => PostComment, (comment) => comment.post)
  @Exclude()
  comments: PostComment[];

  @OneToMany(() => PostHashtag, (ph) => ph.post)
  @Exclude()
  postHashtags: PostHashtag[];
}

import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Post } from './post.entity';
import { Hashtag } from './hashtag.entity';

@Index('idx_post_hashtags_post_id', ['postId'])
@Index('idx_post_hashtags_hashtag_id', ['hashtagId'])
@Entity('post_hashtags')
@Unique(['postId', 'hashtagId'])
export class PostHashtag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: false, name: 'post_id' })
  @Exclude()
  postId: number;

  @Column({ type: 'int', nullable: false, name: 'hashtag_id' })
  @Exclude()
  hashtagId: number;

  @ManyToOne(() => Post, (post) => post.postHashtags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  @Exclude()
  post: Post;

  @ManyToOne(() => Hashtag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hashtag_id' })
  hashtag: Hashtag;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

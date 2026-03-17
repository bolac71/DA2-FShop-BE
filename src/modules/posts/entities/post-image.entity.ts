import { Exclude } from 'class-transformer';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, UpdateDateColumn, JoinColumn, Index } from 'typeorm';
import { Post } from './post.entity';

@Index('idx_post_images_post_id', ['postId'])
@Entity('post_images')
export class PostImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'public_id', nullable: true })
  publicId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', nullable: false, name: 'post_id' })
  @Exclude()
  postId: number;

  @ManyToOne(() => Post, (post) => post.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  @Exclude()
  post: Post;
}

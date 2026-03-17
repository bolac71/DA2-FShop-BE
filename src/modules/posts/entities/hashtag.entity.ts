import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Index('idx_hashtags_name', ['name'], { unique: true })
@Entity('hashtags')
export class Hashtag {
  @PrimaryGeneratedColumn()
  id: number;

  // Normalized: lowercase, no '#', e.g. "summer", "ootd"
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  // Denormalized counter for trending queries
  @Column({ type: 'int', default: 0, name: 'post_count' })
  postCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

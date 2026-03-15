import { Exclude } from "class-transformer";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Review } from "./review.entity";

@Entity('review_images')
export class ReviewImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ nullable: true, name: 'public_id' })
  publicId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'int', nullable: false, name: 'review_id' })
  reviewId: number;

  @ManyToOne(() => Review, (review) => review.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  @Exclude()
  review: Review;
}
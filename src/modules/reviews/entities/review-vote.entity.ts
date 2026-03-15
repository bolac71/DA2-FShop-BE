import { Exclude } from "class-transformer";
import { User } from "src/modules/users/entities/user.entity";
import { Entity, Unique, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Review } from "./review.entity";

@Entity('review_votes')
@Unique(['review', 'user']) 
export class ReviewVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'review_id', type: 'int' })
  reviewId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => Review, (review) => review.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_id' })
  @Exclude()
  review: Review;

  @ManyToOne(() => User, (user) => user.reviewVotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'boolean', default: true, name: 'is_helpful' })
  isHelpful: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
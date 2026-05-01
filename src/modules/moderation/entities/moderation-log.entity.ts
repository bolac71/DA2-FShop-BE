import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('idx_moderation_logs_content', ['contentType', 'contentId'])
@Index('idx_moderation_logs_decision', ['decision'])
@Index('idx_moderation_logs_created_at', ['createdAt'])
@Entity('moderation_logs')
export class ModerationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: ['review', 'post_comment', 'livestream_comment'], name: 'content_type' })
  contentType: 'review' | 'post_comment' | 'livestream_comment';

  @Column({ type: 'int', name: 'content_id' })
  contentId: number;

  @Column({ type: 'text', name: 'content_text' })
  contentText: string;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'rule_score' })
  ruleScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'ml_score' })
  mlScore: number;

  @Column({ type: 'jsonb', name: 'ml_labels' })
  mlLabels: Record<string, number>;

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'final_score' })
  finalScore: number;

  @Column({ type: 'enum', enum: ['approved', 'flagged'], name: 'decision' })
  decision: 'approved' | 'flagged';

  @Column({ type: 'enum', enum: ['NORMAL', 'HIGH'], default: 'NORMAL', name: 'priority' })
  priority: 'NORMAL' | 'HIGH';

  @Column({ type: 'decimal', precision: 5, scale: 4, name: 'confidence' })
  confidence: number;

  @Column({ type: 'jsonb', name: 'signals', default: '{}' })
  signals: Record<string, unknown>;

  @Column({ type: 'int', nullable: true, name: 'reviewed_by' })
  reviewedBy: number | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'is_overridden' })
  isOverridden: boolean;

  @Column({ type: 'enum', enum: ['approved', 'rejected'], nullable: true, name: 'override_decision' })
  overrideDecision: 'approved' | 'rejected' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

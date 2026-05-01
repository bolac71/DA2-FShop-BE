import { IsEnum, IsInt, IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ModerationQueueQueryDto {
  @IsOptional()
  @IsEnum(['review', 'post_comment', 'livestream_comment'])
  contentType?: 'review' | 'post_comment' | 'livestream_comment';

  @IsOptional()
  @IsEnum(['NORMAL', 'HIGH'])
  priority?: 'NORMAL' | 'HIGH';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class OverrideDecisionDto {
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';
}

export interface ModerationV2ApiResponse {
  content_id: number | null;
  content_type: string;
  rule_score: number;
  ml_scores: Array<{ label: string; score: number }>;
  final_score: number;
  decision: 'approved' | 'flagged';
  priority: 'NORMAL' | 'HIGH';
  confidence: number;
  processing_ms: number;
  signals: Record<string, unknown>;
  matched_patterns: string[];
}

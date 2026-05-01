import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ModerationLog } from './entities/moderation-log.entity';
import { Review } from '../reviews/entities/review.entity';
import { PostComment } from '../posts/entities/post-comment.entity';
import { LivestreamComment } from '../livestreams/entities/livestream-comment.entity';
import type { ModerationV2ApiResponse } from './dtos/moderation.dto';
import type { ModerationQueueQueryDto, OverrideDecisionDto } from './dtos/moderation.dto';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly aiServiceUrl: string;
  private readonly timeoutMs = 5000;

  constructor(
    @InjectRepository(ModerationLog)
    private readonly logRepo: Repository<ModerationLog>,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      this.configService.get<string>('AI_SERVER_URL') ||
      'http://localhost:8001';
  }

  async moderateContent(
    text: string,
    contentType: 'review' | 'post_comment' | 'livestream_comment',
    contentId: number,
    userId?: number,
  ): Promise<void> {
    if (!text?.trim()) return;

    let result: ModerationV2ApiResponse;
    try {
      const response = await fetch(`${this.aiServiceUrl}/moderate/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          content_type: contentType,
          content_id: contentId,
          user_id: userId ?? null,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(`AI moderation returned ${response.status} for ${contentType}#${contentId}`);
        return;
      }

      result = (await response.json()) as ModerationV2ApiResponse;
    } catch (err) {
      this.logger.warn(`AI moderation call failed for ${contentType}#${contentId}: ${(err as Error).message}`);
      return;
    }

    const mlScore = result.ml_scores.length
      ? Math.max(...result.ml_scores.map((l) => l.score))
      : 0;

    const mlLabels: Record<string, number> = {};
    for (const l of result.ml_scores) {
      mlLabels[l.label] = l.score;
    }

    const log = this.logRepo.create({
      contentType,
      contentId,
      contentText: text.trim(),
      ruleScore: result.rule_score,
      mlScore,
      mlLabels,
      finalScore: result.final_score,
      decision: result.decision,
      priority: result.priority,
      confidence: result.confidence,
      signals: result.signals ?? {},
    });

    await this.logRepo.save(log);

    // Update moderationStatus on the content entity
    await this.updateContentStatus(contentType, contentId, result.decision);
  }

  private async updateContentStatus(
    contentType: 'review' | 'post_comment' | 'livestream_comment',
    contentId: number,
    decision: 'approved' | 'flagged',
  ): Promise<void> {
    const status = decision === 'approved' ? 'approved' : 'flagged';
    try {
      if (contentType === 'review') {
        await this.dataSource.getRepository(Review).update(contentId, { moderationStatus: status });
      } else if (contentType === 'post_comment') {
        await this.dataSource.getRepository(PostComment).update(contentId, { moderationStatus: status });
      } else {
        await this.dataSource.getRepository(LivestreamComment).update(contentId, { moderationStatus: status });
      }
    } catch (err) {
      this.logger.warn(`Failed to update moderation status for ${contentType}#${contentId}: ${(err as Error).message}`);
    }
  }

  async getModerationQueue(query: ModerationQueueQueryDto) {
    const { contentType, priority, page = 1, limit = 20 } = query;

    const qb = this.logRepo
      .createQueryBuilder('log')
      .where('log.decision = :decision', { decision: 'flagged' })
      .andWhere('log.isOverridden = false')
      .orderBy('log.priority', 'DESC')
      .addOrderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (contentType) qb.andWhere('log.contentType = :contentType', { contentType });
    if (priority) qb.andWhere('log.priority = :priority', { priority });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async overrideDecision(logId: number, dto: OverrideDecisionDto, adminId: number) {
    const log = await this.logRepo.findOneByOrFail({ id: logId });

    log.isOverridden = true;
    log.overrideDecision = dto.decision;
    log.reviewedBy = adminId;
    log.reviewedAt = new Date();
    await this.logRepo.save(log);

    // Sync status on the content entity based on admin's override
    const newStatus = dto.decision === 'approved' ? 'approved' : 'flagged';
    await this.updateContentStatus(log.contentType, log.contentId, newStatus === 'approved' ? 'approved' : 'flagged');

    return log;
  }

  async getStats() {
    const [totalFlagged, pendingReview, highPriority] = await Promise.all([
      this.logRepo.count({ where: { decision: 'flagged' } }),
      this.logRepo.count({ where: { decision: 'flagged', isOverridden: false } }),
      this.logRepo.count({ where: { decision: 'flagged', isOverridden: false, priority: 'HIGH' } }),
    ]);

    const autoApproved = await this.logRepo.count({ where: { decision: 'approved' } });
    const total = totalFlagged + autoApproved;
    const autoApprovedRate = total > 0 ? Math.round((autoApproved / total) * 100) : 0;

    // Label distribution from recent 500 flagged logs
    const recent = await this.logRepo.find({
      where: { decision: 'flagged' },
      order: { createdAt: 'DESC' },
      take: 500,
      select: ['mlLabels'],
    });

    const labelTotals: Record<string, number> = {};
    for (const log of recent) {
      for (const [label, score] of Object.entries(log.mlLabels ?? {})) {
        labelTotals[label] = (labelTotals[label] ?? 0) + (score > 0.5 ? 1 : 0);
      }
    }

    return {
      totalFlagged,
      pendingReview,
      highPriority,
      autoApproved,
      autoApprovedRate,
      labelDistribution: labelTotals,
    };
  }
}

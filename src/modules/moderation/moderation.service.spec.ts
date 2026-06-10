import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { PostComment } from '../posts/entities/post-comment.entity';
import { MetricsService } from '../metrics/metrics.service';
import { ModerationLog } from './entities/moderation-log.entity';
import { ModerationService } from './moderation.service';

type QueryBuilderMock = {
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

function createQueryBuilderMock(): QueryBuilderMock {
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  Object.values(qb).forEach((fn) => {
    if (fn !== qb.getManyAndCount) {
      fn.mockReturnValue(qb);
    }
  });

  return qb;
}

describe('ModerationService', () => {
  let service: ModerationService;
  let logRepo: jest.Mocked<Partial<Repository<ModerationLog>>>;
  let dataSource: { getRepository: jest.Mock };
  let metricsService: jest.Mocked<Pick<MetricsService, 'recordModerationDecision'>>;
  let update: jest.Mock;

  beforeEach(() => {
    logRepo = {
      createQueryBuilder: jest.fn(),
      findOneByOrFail: jest.fn(),
      save: jest.fn(),
    };
    update = jest.fn().mockResolvedValue(undefined);
    dataSource = {
      getRepository: jest.fn(() => ({ update })),
    };
    metricsService = {
      recordModerationDecision: jest.fn(),
    };

    service = new ModerationService(
      logRepo as Repository<ModerationLog>,
      {
        get: jest.fn((key: string) =>
          key === 'AI_SERVER_URL' ? 'http://ai.test' : undefined,
        ),
      } as unknown as ConfigService,
      dataSource as unknown as DataSource,
      metricsService as MetricsService,
    );
  });

  it('queries pending queue as flagged content that is not overridden', async () => {
    const qb = createQueryBuilderMock();
    logRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

    await service.getModerationQueue({ status: 'pending', page: 2, limit: 10 });

    expect(qb.where).toHaveBeenCalledWith('log.decision = :decision', {
      decision: 'flagged',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('log.isOverridden = false');
    expect(qb.andWhere).toHaveBeenCalledWith('log.priority = :pendingPriority', {
      pendingPriority: 'NORMAL',
    });
    expect(qb.orderBy).toHaveBeenCalledWith('log.priority', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
  });

  it('queries rejected queue as reviewed content with rejected override decision', async () => {
    const qb = createQueryBuilderMock();
    logRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

    await service.getModerationQueue({
      status: 'rejected',
      contentType: 'post_comment',
      priority: 'HIGH',
    });

    expect(qb.where).toHaveBeenCalledWith('log.isOverridden = true');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'log.overrideDecision = :status',
      { status: 'rejected' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'log.contentType = :contentType',
      { contentType: 'post_comment' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('log.priority = :priority', {
      priority: 'HIGH',
    });
    expect(qb.orderBy).toHaveBeenCalledWith('log.reviewedAt', 'DESC');
  });

  it('syncs rejected override decisions to the target content entity', async () => {
    const log = {
      id: 123,
      contentType: 'post_comment',
      contentId: 9,
      isOverridden: false,
      overrideDecision: null,
      reviewedBy: null,
      reviewedAt: null,
    } as ModerationLog;
    logRepo.findOneByOrFail = jest.fn().mockResolvedValue(log);
    logRepo.save = jest.fn().mockImplementation((value) => Promise.resolve(value));

    await service.overrideDecision(123, { decision: 'rejected' }, 77);

    expect(log.isOverridden).toBe(true);
    expect(log.overrideDecision).toBe('rejected');
    expect(log.reviewedBy).toBe(77);
    expect(log.reviewedAt).toBeInstanceOf(Date);
    expect(dataSource.getRepository).toHaveBeenCalledWith(PostComment);
    expect(update).toHaveBeenCalledWith(9, { moderationStatus: 'rejected' });
  });
});

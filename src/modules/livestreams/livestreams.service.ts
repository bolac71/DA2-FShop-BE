import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ILike, In, Repository } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import {
  AddLivestreamProductDto,
  CreateLivestreamCommentDto,
  CreateLivestreamDto,
  QueryLivestreamDto,
  UpdateLivestreamDto,
  AddLivestreamProductsBatchDto,
  CreatePollDto,
} from './dtos';
import {
  Livestream,
  LivestreamComment,
  LivestreamOrder,
  LivestreamProduct,
} from './entities';
import { LivestreamPoll, PollResult } from './entities/livestream-poll.entity';
import { LivestreamPollVote } from './entities/livestream-poll-vote.entity';

export type PollVoteResult = {
  pollId: number;
  livestreamId: number;
  options: Array<{ index: number; text: string; count: number; percentage: number }>;
  totalVotes: number;
};
import { LivestreamStatus, NotificationType, Role } from 'src/constants';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities';
import { User } from '../users/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CloudinaryResponse } from '../cloudinary/dto/cloudinary-response';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class LivestreamsService {
  private readonly logger = new Logger(LivestreamsService.name);

  constructor(
    @InjectRepository(Livestream)
    private readonly livestreamRepository: Repository<Livestream>,
    @InjectRepository(LivestreamProduct)
    private readonly livestreamProductRepository: Repository<LivestreamProduct>,
    @InjectRepository(LivestreamComment)
    private readonly livestreamCommentRepository: Repository<LivestreamComment>,
    @InjectRepository(LivestreamOrder)
    private readonly livestreamOrderRepository: Repository<LivestreamOrder>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(LivestreamPoll)
    private readonly pollRepository: Repository<LivestreamPoll>,
    @InjectRepository(LivestreamPollVote)
    private readonly pollVoteRepository: Repository<LivestreamPollVote>,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly moderationService: ModerationService,
  ) {}

  async create(
    hostId: number,
    dto: CreateLivestreamDto,
    coverImage?: Express.Multer.File,
  ) {
    let uploadedCover: CloudinaryResponse;

    if (coverImage) {
      uploadedCover = await this.cloudinaryService.uploadFileToFolder(
        coverImage,
        'livestream/covers',
        'image',
      );
      this.assertUploadedFile(uploadedCover);
    }

    const livestream = this.livestreamRepository.create({
      hostId,
      title: dto.title,
      description: dto.description,
      coverImageUrl: uploadedCover?.secure_url,
      coverImagePublicId: uploadedCover?.public_id,
      scheduledStartAt: new Date(dto.scheduledStartAt),
      agoraChannel: `live_${Date.now()}_${hostId}`,
      status: LivestreamStatus.SCHEDULED,
      isActive: true,
    });

    try {
      return await this.livestreamRepository.save(livestream);
    } catch (error) {
      const uploadedPublicId = this.extractPublicId(uploadedCover);
      if (uploadedPublicId) {
        await Promise.allSettled([
          this.cloudinaryService.deleteFile(uploadedPublicId),
        ]);
      }
      throw error;
    }
  }

  async update(
    livestreamId: number,
    hostId: number,
    dto: UpdateLivestreamDto,
    coverImage?: Express.Multer.File,
  ) {
    const livestream = await this.ensureHostAccess(livestreamId, hostId);

    if (livestream.status !== LivestreamStatus.SCHEDULED) {
      if (dto.scheduledStartAt !== undefined) {
        const currentStartAt = new Date(livestream.scheduledStartAt).getTime();
        const newStartAt = new Date(dto.scheduledStartAt).getTime();
        if (currentStartAt !== newStartAt) {
          throw new HttpException(
            'Cannot update scheduled start time of an ongoing or ended livestream',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    if (dto.title !== undefined) livestream.title = dto.title;
    if (dto.description !== undefined) livestream.description = dto.description;
    if (dto.scheduledStartAt !== undefined) {
      livestream.scheduledStartAt = new Date(dto.scheduledStartAt);
    }
    if (dto.isActive !== undefined) livestream.isActive = dto.isActive;

    let uploadedCover: CloudinaryResponse;

    const oldPublicId = livestream.coverImagePublicId;

    if (coverImage) {
      uploadedCover = await this.cloudinaryService.uploadFileToFolder(
        coverImage,
        'livestream/covers',
        'image',
      );
      this.assertUploadedFile(uploadedCover);
      livestream.coverImageUrl = uploadedCover?.secure_url;
      livestream.coverImagePublicId = uploadedCover?.public_id;
    }

    try {
      const saved = await this.livestreamRepository.save(livestream);

      if (coverImage && oldPublicId && oldPublicId !== saved.coverImagePublicId) {
        await Promise.allSettled([this.cloudinaryService.deleteFile(oldPublicId)]);
      }

      return saved;
    } catch (error) {
      const uploadedPublicId = this.extractPublicId(uploadedCover);
      if (uploadedPublicId) {
        await Promise.allSettled([
          this.cloudinaryService.deleteFile(uploadedPublicId),
        ]);
      }
      throw error;
    }
  }

  async goLive(livestreamId: number, hostId: number) {
    const livestream = await this.ensureHostAccess(livestreamId, hostId);

    if (livestream.status === LivestreamStatus.ENDED) {
      throw new HttpException('Livestream already ended', HttpStatus.BAD_REQUEST);
    }
    if (livestream.status === LivestreamStatus.LIVE) {
      return livestream;
    }

    livestream.status = LivestreamStatus.LIVE;
    livestream.startedAt = new Date();
    const savedLivestream = await this.livestreamRepository.save(livestream);

    await this.notificationsService.createForAllActiveUsers({
      title: `Livestream started: ${savedLivestream.title}`,
      message: `A new fashion livestream is now live. Join now!`,
      type: NotificationType.LIVESTREAM,
      referenceId: savedLivestream.id,
    });

    return savedLivestream;
  }

  async end(livestreamId: number, hostId: number) {
    const livestream = await this.ensureLivestreamExists(livestreamId);

    if (livestream.status === LivestreamStatus.ENDED) {
      return livestream;
    }

    livestream.status = LivestreamStatus.ENDED;
    livestream.endedAt = new Date();

    const viewerCount = await this.getViewerCount(livestreamId);
    livestream.viewerCount = viewerCount;
    livestream.totalViewers = Math.max(livestream.totalViewers, viewerCount);

    await this.clearViewerTracking(livestreamId);
    return this.livestreamRepository.save(livestream);
  }

  async findAll(query: QueryLivestreamDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
    } = query;

    const where = {
      isActive: true,
      ...(status && { status }),
      ...(search && { title: ILike(`%${search}%`) }),
    };

    const [data, total] = await this.livestreamRepository.findAndCount({
      where,
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
      relations: ['host'],
    });

    return {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
  }

  async findOne(livestreamId: number) {
    const livestream = await this.livestreamRepository.findOne({
      where: { id: livestreamId, isActive: true },
      relations: [
        'host',
        'pinnedProducts',
        'pinnedProducts.product',
        'pinnedProducts.product.images',
        'pinnedProducts.product.variants',
      ],
    });
    if (!livestream) {
      throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    }

    const viewerCount = await this.getViewerCount(livestreamId);
    return { ...livestream, viewerCount };
  }

  async addProduct(livestreamId: number, hostId: number, dto: AddLivestreamProductDto) {
    const livestream = await this.ensureHostAccess(livestreamId, hostId);
    if (livestream.status === LivestreamStatus.ENDED) {
      throw new HttpException('Livestream already ended', HttpStatus.BAD_REQUEST);
    }

    const product = await this.productRepository.findOneBy({
      id: dto.productId,
      isActive: true,
    });
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    const existed = await this.livestreamProductRepository.findOneBy({
      livestreamId,
      productId: dto.productId,
    });

    if (existed) {
      existed.position = dto.position;
      return this.livestreamProductRepository.save(existed);
    }

    const livestreamProduct = this.livestreamProductRepository.create({
      livestreamId,
      productId: dto.productId,
      position: dto.position,
      unitsSold: 0,
    });
    return this.livestreamProductRepository.save(livestreamProduct);
  }

  async addProductsBatch(livestreamId: number, hostId: number, dto: AddLivestreamProductsBatchDto) {
    const livestream = await this.ensureHostAccess(livestreamId, hostId);
    if (livestream.status === LivestreamStatus.ENDED) {
      throw new HttpException('Livestream already ended', HttpStatus.BAD_REQUEST);
    }

    const products = await this.productRepository.find({
      where: {
        id: In(dto.productIds),
        isActive: true,
      }
    });

    const existingPinned = await this.livestreamProductRepository.find({
      where: { livestreamId }
    });
    const existingProductIds = new Set(existingPinned.map(ep => ep.productId));
    let nextPosition = Math.max(0, ...existingPinned.map(ep => ep.position)) + 1;

    const newPinnedProducts: LivestreamProduct[] = [];
    for (const product of products) {
      if (!existingProductIds.has(product.id)) {
        const lp = this.livestreamProductRepository.create({
          livestreamId,
          productId: product.id,
          position: nextPosition++,
          unitsSold: 0,
        });
        newPinnedProducts.push(lp);
      }
    }

    if (newPinnedProducts.length > 0) {
      await this.livestreamProductRepository.save(newPinnedProducts);
    }

    return { success: true, count: newPinnedProducts.length };
  }

  async removeProduct(livestreamId: number, hostId: number, productId: number) {
    await this.ensureHostAccess(livestreamId, hostId);

    const existed = await this.livestreamProductRepository.findOneBy({
      livestreamId,
      productId,
    });
    if (!existed) {
      throw new HttpException('Pinned product not found', HttpStatus.NOT_FOUND);
    }

    await this.livestreamProductRepository.delete({ id: existed.id });
    return { success: true };
  }

  async getComments(livestreamId: number, query: QueryLivestreamDto) {
    await this.ensureLivestreamExists(livestreamId);
    const { page, limit, sortOrder = 'DESC' } = query;
    const qb = this.livestreamCommentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.livestreamId = :livestreamId', { livestreamId })
      .andWhere('comment.isActive = :isActive', { isActive: true })
      .andWhere('comment.moderationStatus != :hiddenStatus', { hiddenStatus: 'rejected' })
      .andWhere((qb) => {
        const flaggedLogSubQuery = qb
          .subQuery()
          .select('1')
          .from('moderation_logs', 'log')
          .where('log.content_type = :commentContentType')
          .andWhere('log.content_id = comment.id')
          .andWhere('log.decision = :flaggedDecision')
          .andWhere('log.priority = :hiddenPriority')
          .andWhere('log.is_overridden = false')
          .getQuery();

        return `NOT EXISTS ${flaggedLogSubQuery}`;
      })
      .setParameters({
        commentContentType: 'livestream_comment',
        flaggedDecision: 'flagged',
        hiddenPriority: 'HIGH',
      })
      .orderBy('comment.createdAt', sortOrder);

    if (page && limit) {
      qb.take(limit).skip((page - 1) * limit);
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
  }

  async addComment(livestreamId: number, userId: number, dto: CreateLivestreamCommentDto) {
    const livestream = await this.ensureLivestreamExists(livestreamId);
    if (livestream.status !== LivestreamStatus.LIVE) {
      throw new HttpException(
        'Can only comment while livestream is live',
        HttpStatus.BAD_REQUEST,
      );
    }

    const comment = this.livestreamCommentRepository.create({
      livestreamId,
      userId,
      content: dto.content,
      isActive: true,
      likeCount: 0,
    });
    const savedComment = await this.livestreamCommentRepository.save(comment);

    const hydratedComment = await this.livestreamCommentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });

    if (!hydratedComment) {
      throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
    }

    const moderationStatus = await this.moderationService
      .moderateContent(dto.content, 'livestream_comment', hydratedComment.id, userId)
      .catch((err: Error) => {
        this.logger.warn(`Livestream comment moderation failed: ${err.message}`);
        return null;
      });

    if (moderationStatus === 'rejected') {
      throw new HttpException(
        'Bình luận của bạn đã bị ẩn do vi phạm tiêu chuẩn cộng đồng.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return hydratedComment;
  }

  async issueAgoraToken(livestreamId: number, userId: number) {
    const livestream = await this.ensureLivestreamExists(livestreamId);

    const appId = this.configService.get<string>('AGORA_APP_ID');
    const appCertificate = this.configService.get<string>('AGORA_APP_CERTIFICATE');
    const expiresIn = Number(
      this.configService.get<string>('AGORA_TOKEN_EXPIRE_SECONDS', '3600'),
    );

    if (!appId || !appCertificate) {
      throw new HttpException(
        'Agora configuration is missing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expiresIn;
    const role = livestream.hostId === userId ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      livestream.agoraChannel,
      userId,
      role,
      expiresIn,
      privilegeExpiredTs,
    );

    return {
      token,
      channel: livestream.agoraChannel,
      uid: userId,
      role: role === RtcRole.PUBLISHER ? 'publisher' : 'subscriber',
      expiresAt: privilegeExpiredTs,
    };
  }

  async addViewer(livestreamId: number, userId: number, socketId: string) {
    await this.ensureLivestreamExists(livestreamId);
    await this.redis.sadd(this.viewerSocketKey(livestreamId, userId), socketId);
    await this.redis.sadd(this.viewerKey(livestreamId), String(userId));
    await this.syncViewerCount(livestreamId);
  }

  async removeViewer(livestreamId: number, userId: number, socketId: string) {
    const socketKey = this.viewerSocketKey(livestreamId, userId);
    await this.redis.srem(socketKey, socketId);

    const activeSockets = await this.redis.scard(socketKey);
    if (activeSockets <= 0) {
      await this.redis.del(socketKey);
      await this.redis.srem(this.viewerKey(livestreamId), String(userId));
    }

    await this.syncViewerCount(livestreamId);
  }

  async getViewerCount(livestreamId: number) {
    return this.redis.scard(this.viewerKey(livestreamId));
  }

  async linkOrderToLivestream(livestreamId: number, orderId: number) {
    const livestream = await this.livestreamRepository.findOneBy({
      id: livestreamId,
      isActive: true,
    });
    if (!livestream) {
      throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    }

    const order = await this.orderRepository.findOneBy({ id: orderId });
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    const existed = await this.livestreamOrderRepository.findOneBy({ orderId });
    if (existed) {
      return existed;
    }

    const livestreamOrder = this.livestreamOrderRepository.create({
      livestreamId,
      orderId,
    });

    return this.livestreamOrderRepository.save(livestreamOrder);
  }

  async getSummary(livestreamId: number) {
    const livestream = await this.livestreamRepository.findOne({
      where: { id: livestreamId, isActive: true },
      relations: [
        'pinnedProducts',
        'pinnedProducts.product',
        'pinnedProducts.product.images',
        'livestreamOrders',
        'livestreamOrders.order',
        'livestreamOrders.order.items',
        'livestreamOrders.order.items.variant',
        'livestreamOrders.order.items.variant.product',
      ],
    });

    if (!livestream) {
      throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    }

    const durationSeconds =
      livestream.startedAt && livestream.endedAt
        ? Math.floor(
            (livestream.endedAt.getTime() - livestream.startedAt.getTime()) / 1000,
          )
        : null;

    const totalComments = await this.livestreamCommentRepository.count({
      where: { livestreamId, isActive: true },
    });

    const orders = livestream.livestreamOrders.map((lo) => lo.order).filter(Boolean);
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount ?? 0),
      0,
    );

    const productMap = new Map<
      number,
      { productId: number; name: string; imageUrl?: string; unitsSold: number; revenue: number }
    >();

    for (const lo of livestream.livestreamOrders) {
      const order = lo.order;
      if (!order?.items) continue;

      for (const item of order.items) {
        const productId = item.variant?.productId;
        if (!productId) continue;

        const existing = productMap.get(productId);
        const itemRevenue = Number(item.price ?? 0) * (item.quantity ?? 0);

        if (existing) {
          existing.unitsSold += item.quantity ?? 0;
          existing.revenue += itemRevenue;
        } else {
          const pinnedProduct = livestream.pinnedProducts.find(
            (pp) => pp.productId === productId,
          );
          productMap.set(productId, {
            productId,
            name: pinnedProduct?.product?.name ?? `Product #${productId}`,
            imageUrl: pinnedProduct?.product?.images?.[0]?.imageUrl,
            unitsSold: item.quantity ?? 0,
            revenue: itemRevenue,
          });
        }
      }
    }

    const topProducts = [...productMap.values()].sort(
      (a, b) => b.revenue - a.revenue,
    );

    return {
      livestreamId,
      title: livestream.title,
      status: livestream.status,
      scheduledStartAt: livestream.scheduledStartAt,
      startedAt: livestream.startedAt,
      endedAt: livestream.endedAt,
      durationSeconds,
      totalViewers: livestream.totalViewers,
      totalComments,
      totalOrders,
      totalRevenue,
      topProducts,
    };
  }

  // ──────────────────────────────────────────────────────────
  // LIVE POLL
  // ──────────────────────────────────────────────────────────

  async createPoll(livestreamId: number, dto: CreatePollDto): Promise<LivestreamPoll> {
    const livestream = await this.livestreamRepository.findOneBy({ id: livestreamId, isActive: true });
    if (!livestream) throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    if (livestream.status !== LivestreamStatus.LIVE) {
      throw new HttpException('Poll can only be created during a live stream', HttpStatus.BAD_REQUEST);
    }

    // Close any existing active poll for this livestream
    const existing = await this.pollRepository.findOne({
      where: { livestreamId, status: 'active' },
    });
    if (existing) {
      await this.closePoll(existing.id);
    }

    const poll = this.pollRepository.create({
      livestreamId,
      question: dto.question,
      options: dto.options,
      status: 'active',
      totalVotes: 0,
    });
    const saved = await this.pollRepository.save(poll);

    // Init Redis vote counts: { "0": 0, "1": 0, ... }
    const countsKey = this.pollCountsKey(livestreamId, saved.id);
    const initCounts: Record<string, string> = {};
    dto.options.forEach((_, i) => { initCounts[String(i)] = '0'; });
    await this.redis.hset(countsKey, initCounts);
    await this.redis.set(this.activePollKey(livestreamId), String(saved.id));

    return saved;
  }

  async submitVote(pollId: number, userId: number, optionIndex: number): Promise<PollVoteResult> {
    const poll = await this.pollRepository.findOneBy({ id: pollId });
    if (!poll) throw new HttpException('Poll not found', HttpStatus.NOT_FOUND);
    if (poll.status !== 'active') throw new HttpException('Poll is already closed', HttpStatus.BAD_REQUEST);
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new HttpException('Invalid option index', HttpStatus.BAD_REQUEST);
    }

    const votedKey = this.pollVotedKey(poll.livestreamId, pollId);

    // Prevent double-voting
    const alreadyVoted = await this.redis.sismember(votedKey, String(userId));
    if (alreadyVoted) throw new HttpException('Bạn đã bình chọn rồi', HttpStatus.CONFLICT);

    // Mark voted in Redis (before DB to prevent race condition)
    await this.redis.sadd(votedKey, String(userId));

    // Save to DB (fire-and-forget errors are logged, not thrown)
    this.pollVoteRepository.save({ pollId, userId, optionIndex }).catch((err) => {
      this.logger.error(`Failed to persist vote pollId=${pollId} userId=${userId}: ${err.message}`);
    });

    // Increment count in Redis
    const countsKey = this.pollCountsKey(poll.livestreamId, pollId);
    await this.redis.hincrby(countsKey, String(optionIndex), 1);

    // Recalculate
    return this.buildPollVoteResult(poll, countsKey);
  }

  async closePoll(pollId: number): Promise<LivestreamPoll> {
    const poll = await this.pollRepository.findOneBy({ id: pollId });
    if (!poll) throw new HttpException('Poll not found', HttpStatus.NOT_FOUND);
    if (poll.status === 'closed') return poll;

    const countsKey = this.pollCountsKey(poll.livestreamId, pollId);
    const rawCounts = await this.redis.hgetall(countsKey);

    let totalVotes = 0;
    const countMap: Record<number, number> = {};
    for (const [idx, cnt] of Object.entries(rawCounts)) {
      const count = parseInt(cnt, 10) || 0;
      countMap[Number(idx)] = count;
      totalVotes += count;
    }

    const results: PollResult[] = poll.options.map((text, i) => {
      const count = countMap[i] ?? 0;
      return {
        optionIndex: i,
        text,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });

    poll.status = 'closed';
    poll.totalVotes = totalVotes;
    poll.results = results;
    poll.endedAt = new Date();
    const saved = await this.pollRepository.save(poll);

    // Cleanup Redis
    await this.redis.del(countsKey, this.pollVotedKey(poll.livestreamId, pollId));
    const activePollKey = this.activePollKey(poll.livestreamId);
    const activePollId = await this.redis.get(activePollKey);
    if (activePollId === String(pollId)) {
      await this.redis.del(activePollKey);
    }

    return saved;
  }

  async getActivePoll(livestreamId: number): Promise<LivestreamPoll | null> {
    return this.pollRepository.findOne({
      where: { livestreamId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async getPollVoteResult(pollId: number): Promise<PollVoteResult> {
    const poll = await this.pollRepository.findOneBy({ id: pollId });
    if (!poll) throw new HttpException('Poll not found', HttpStatus.NOT_FOUND);
    const countsKey = this.pollCountsKey(poll.livestreamId, pollId);
    return this.buildPollVoteResult(poll, countsKey);
  }

  private async buildPollVoteResult(poll: LivestreamPoll, countsKey: string): Promise<PollVoteResult> {
    const rawCounts = await this.redis.hgetall(countsKey);
    let totalVotes = 0;
    const countMap: Record<number, number> = {};
    for (const [idx, cnt] of Object.entries(rawCounts)) {
      const count = parseInt(cnt, 10) || 0;
      countMap[Number(idx)] = count;
      totalVotes += count;
    }

    return {
      pollId: poll.id,
      livestreamId: poll.livestreamId,
      options: poll.options.map((text, i) => {
        const count = countMap[i] ?? 0;
        return {
          index: i,
          text,
          count,
          percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
        };
      }),
      totalVotes,
    };
  }

  private pollCountsKey(livestreamId: number, pollId: number) {
    return `livestream:${livestreamId}:poll:${pollId}:counts`;
  }

  private pollVotedKey(livestreamId: number, pollId: number) {
    return `livestream:${livestreamId}:poll:${pollId}:voted`;
  }

  private activePollKey(livestreamId: number) {
    return `livestream:${livestreamId}:active_poll`;
  }

  private async ensureHostAccess(livestreamId: number, hostId: number) {
    const livestream = await this.livestreamRepository.findOneBy({
      id: livestreamId,
      isActive: true,
    });
    if (!livestream) {
      throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    }

    const user = await this.userRepository.findOneBy({ id: hostId });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.role !== Role.ADMIN && livestream.hostId !== hostId) {
      throw new HttpException(
        'You do not have permission to manage this livestream',
        HttpStatus.FORBIDDEN,
      );
    }
    return livestream;
  }

  private async ensureLivestreamExists(livestreamId: number) {
    const livestream = await this.livestreamRepository.findOneBy({
      id: livestreamId,
      isActive: true,
    });
    if (!livestream) {
      throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    }
    return livestream;
  }

  private viewerKey(livestreamId: number) {
    return `livestream:${livestreamId}:viewers`;
  }

  private viewerSocketKey(livestreamId: number, userId: number) {
    return `livestream:${livestreamId}:viewer-sockets:${userId}`;
  }

  private async syncViewerCount(livestreamId: number) {
    const viewerCount = await this.getViewerCount(livestreamId);
    const livestream = await this.livestreamRepository.findOne({
      where: { id: livestreamId },
      select: { totalViewers: true },
    });

    const totalViewers = Math.max(livestream?.totalViewers ?? 0, viewerCount);

    await this.livestreamRepository.update(
      { id: livestreamId },
      { viewerCount, totalViewers },
    );
    return viewerCount;
  }

  private async clearViewerTracking(livestreamId: number) {
    await this.redis.del(this.viewerKey(livestreamId));

    let cursor = '0';
    const pattern = `livestream:${livestreamId}:viewer-sockets:*`;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '100',
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  private assertUploadedFile(
    upload: CloudinaryResponse,
  ): asserts upload is NonNullable<CloudinaryResponse> & {
    secure_url: string;
    public_id: string;
  } {
    if (!upload || !('secure_url' in upload) || !('public_id' in upload)) {
      throw new HttpException('Failed to upload cover image', HttpStatus.BAD_REQUEST);
    }
  }

  private extractPublicId(upload: CloudinaryResponse): string | null {
    if (!upload || !('public_id' in upload)) {
      return null;
    }

    const publicId = upload.public_id;
    return typeof publicId === 'string' && publicId.length > 0 ? publicId : null;
  }
}

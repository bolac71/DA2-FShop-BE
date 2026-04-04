import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ILike, Repository } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import {
  AddLivestreamProductDto,
  CreateLivestreamCommentDto,
  CreateLivestreamDto,
  QueryLivestreamDto,
  UpdateLivestreamDto,
} from './dtos';
import {
  Livestream,
  LivestreamComment,
  LivestreamOrder,
  LivestreamProduct,
} from './entities';
import { LivestreamStatus, NotificationType } from 'src/constants';
import { NotificationsService } from '../notifications/notifications.service';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CloudinaryResponse } from '../cloudinary/dto/cloudinary-response';

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
    @InjectRedis()
    private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
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
      throw new HttpException(
        'Only scheduled livestream can be updated',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.title !== undefined) livestream.title = dto.title;
    if (dto.description !== undefined) livestream.description = dto.description;
    if (dto.scheduledStartAt !== undefined) {
      livestream.scheduledStartAt = new Date(dto.scheduledStartAt);
    }

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
    });

    return savedLivestream;
  }

  async end(livestreamId: number, hostId: number) {
    const livestream = await this.ensureHostAccess(livestreamId, hostId);

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
    const [data, total] = await this.livestreamCommentRepository.findAndCount({
      where: { livestreamId, isActive: true },
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { createdAt: sortOrder },
      relations: ['user'],
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

  private async ensureHostAccess(livestreamId: number, hostId: number) {
    const livestream = await this.livestreamRepository.findOneBy({
      id: livestreamId,
      isActive: true,
    });
    if (!livestream) {
      throw new HttpException('Livestream not found', HttpStatus.NOT_FOUND);
    }
    if (livestream.hostId !== hostId) {
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

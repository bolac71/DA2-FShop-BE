import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification, User } from 'src/entities';
import { ILike, MoreThan, Repository } from 'typeorm';
import { NotificationGateway } from './notifications.gateway';
import {
  AdminQueryNotificationDto,
  CreateAdminBroadcastDto,
  CreateNotificationDto,
  QueryNotificationDto,
} from './dtos';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private static readonly PUBLIC_NOTIFICATION_BATCH_SIZE = 500;

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private notiGateway: NotificationGateway,
  ) {}

  async create(createNotificationDto: CreateNotificationDto) {
    const { userId } = createNotificationDto;
    this.logger.log(`Create notification start: user=${userId}, type=${createNotificationDto.type}`);

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new HttpException('Not found user', HttpStatus.NOT_FOUND);

    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      user: { id: userId },
      isRead: false,
    });

    const savedNoti = await this.notificationRepository.save(notification);
    this.logger.log(`Notification saved: id=${savedNoti.id}, user=${userId}`);
    
    this.notiGateway.sendToUser(userId, savedNoti);
    this.logger.log(`Notification emitted: id=${savedNoti.id}, user=${userId}`);
    
    return savedNoti;
  }

  createForBroadcast(payload: Omit<CreateNotificationDto, 'userId'>) {
    this.notiGateway.broadcast({
      ...payload,
      isRead: false,
      createdAt: new Date(),
    });
    this.logger.log(`Broadcast notification emitted: type=${payload.type}`);
  }

  async createForAllActiveUsers(payload: Omit<CreateNotificationDto, 'userId'>) {
    let lastUserId = 0;
    let totalInserted = 0;

    while (true) {
      const users = await this.userRepository.find({
        select: { id: true },
        where: { isActive: true, id: MoreThan(lastUserId) },
        order: { id: 'ASC' },
        take: NotificationsService.PUBLIC_NOTIFICATION_BATCH_SIZE,
      });

      if (!users.length) {
        break;
      }

      const notifications = users.map((user) =>
        this.notificationRepository.create({
          ...payload,
          user: { id: user.id },
          isRead: false,
        }),
      );

      await this.notificationRepository.save(notifications, {
        chunk: NotificationsService.PUBLIC_NOTIFICATION_BATCH_SIZE,
      });

      totalInserted += notifications.length;
      lastUserId = users[users.length - 1].id;
    }

    this.logger.log(
      `Public notifications persisted: total=${totalInserted}, type=${payload.type}`,
    );

    return totalInserted;
  }

  async createAdminBroadcast(payload: CreateAdminBroadcastDto, adminId: number) {
    const inserted = await this.createForAllActiveUsers(payload);

    this.notiGateway.emitAdminNotificationCreated({
      ...payload,
      totalRecipients: inserted,
      createdBy: adminId,
      createdAt: new Date(),
    });

    return {
      success: true,
      totalRecipients: inserted,
    };
  }

  async getAdminNotifications(query: AdminQueryNotificationDto) {
    const {
      page,
      limit,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      type,
      isRead,
    } = query;

    const baseWhere = {
      ...(type && { type }),
      ...(isRead !== undefined && { isRead }),
    };

    const where = search
      ? [
          { ...baseWhere, title: ILike(`%${search}%`) },
          { ...baseWhere, message: ILike(`%${search}%`) },
        ]
      : baseWhere;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder },
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

  async getMyNotifications(userId: number, query: QueryNotificationDto) {
    const {
      page,
      limit,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      type,
      isRead
    } = query;

    const [data, total] = await this.notificationRepository.findAndCount({
      where: { user: { id: userId }, type, isRead: isRead === undefined ? undefined : isRead === true },
      ...(page && limit && { take: limit, skip: (page - 1) * limit }),
      order: { [sortBy]: sortOrder, isRead: 'ASC' },
    });

    const response = {
      pagination: {
        total,
        page,
        limit,
      },
      data,
    };
    return response;
  }

  async markOneAsRead(notificationId: number, userId: number) {
    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        user: { id: userId },
      },
    });

    if (!notification) throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);

    if (notification.isRead) return notification; 

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAsRead(userId: number) {
    if (!(await this.userRepository.findBy({ id: userId })))
      throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    return this.notificationRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }
}

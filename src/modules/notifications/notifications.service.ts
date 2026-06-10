import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeviceToken, Notification, User } from 'src/entities';
import { NotificationType, Role } from 'src/constants';
import { ILike, In, MoreThan, Repository } from 'typeorm';
import { NotificationGateway } from './notifications.gateway';
import {
  AdminQueryNotificationDto,
  CreateAdminBroadcastDto,
  CreateNotificationDto,
  QueryNotificationDto,
  RegisterDeviceTokenDto,
} from './dtos';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private static readonly PUBLIC_NOTIFICATION_BATCH_SIZE = 500;
  private static readonly EXPO_PUSH_BATCH_SIZE = 100;
  private static readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(DeviceToken)
    private deviceTokenRepository: Repository<DeviceToken>,
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

    await this.trySendPush(userId, savedNoti);
    
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

    await this.sendBulkPush(payload);

    return totalInserted;
  }

  async notifyAdmins(payload: Omit<CreateNotificationDto, 'userId'>) {
    const admins = await this.userRepository.find({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });

    const notifications = await Promise.all(
      admins.map((admin) =>
        this.create({
          ...payload,
          userId: admin.id,
        }).catch((err) => {
          this.logger.error(`Failed to notify admin ${admin.id}: ${err.message}`);
          return null;
        }),
      ),
    );

    return notifications.filter(Boolean);
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

  async markOneAsRead(notificationId: number, userId: number, role?: string) {
    const isUserAdmin = role === 'admin';

    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        ...(!isUserAdmin && { user: { id: userId } }),
      },
    });

    if (!notification) throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);

    if (notification.isRead) return notification; 

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAsRead(userId: number, role?: string) {
    const isUserAdmin = role === 'admin';

    if (isUserAdmin) {
      return this.notificationRepository.update(
        { isRead: false },
        { isRead: true },
      );
    }

    if (!(await this.userRepository.findOneBy({ id: userId })))
      throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    return this.notificationRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }

  async registerDeviceToken(userId: number, registerDeviceTokenDto: RegisterDeviceTokenDto) {
    if (!(await this.userRepository.findOneBy({ id: userId }))) {
      throw new HttpException('Not found user', HttpStatus.NOT_FOUND);
    }

    const existingToken = await this.deviceTokenRepository.findOne({
      where: { token: registerDeviceTokenDto.token },
    });

    if (existingToken) {
      existingToken.user = { id: userId } as User;
      existingToken.platform = registerDeviceTokenDto.platform;
      existingToken.isActive = true;
      existingToken.lastUsedAt = new Date();

      const saved = await this.deviceTokenRepository.save(existingToken);
      return {
        id: saved.id,
        platform: saved.platform,
        isActive: saved.isActive,
      };
    }

    const newDeviceToken = this.deviceTokenRepository.create({
      token: registerDeviceTokenDto.token,
      platform: registerDeviceTokenDto.platform,
      isActive: true,
      lastUsedAt: new Date(),
      user: { id: userId },
    });

    const saved = await this.deviceTokenRepository.save(newDeviceToken);
    return {
      id: saved.id,
      platform: saved.platform,
      isActive: saved.isActive,
    };
  }

  async unregisterDeviceToken(userId: number, token: string) {
    const existingToken = await this.deviceTokenRepository.findOne({
      where: {
        token,
        user: { id: userId },
      },
    });

    if (!existingToken) {
      return { success: true };
    }

    existingToken.isActive = false;
    existingToken.lastUsedAt = new Date();
    await this.deviceTokenRepository.save(existingToken);

    return { success: true };
  }

  async getMyDeviceTokens(userId: number) {
    const tokens = await this.deviceTokenRepository.find({
      where: { user: { id: userId } },
      order: { updatedAt: 'DESC' },
    });

    return tokens.map((token) => ({
      id: token.id,
      tokenMasked: this.maskToken(token.token),
      platform: token.platform,
      isActive: token.isActive,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    }));
  }

  private async sendBulkPush(payload: Omit<CreateNotificationDto, 'userId'>) {
    let lastTokenId = 0;

    while (true) {
      const tokens = await this.deviceTokenRepository.find({
        where: { isActive: true, id: MoreThan(lastTokenId) },
        order: { id: 'ASC' },
        take: NotificationsService.EXPO_PUSH_BATCH_SIZE,
      });

      if (!tokens.length) break;

      const messages = tokens.map((t) => ({
        to: t.token,
        title: payload.title ?? 'FShop',
        body: payload.message ?? '',
        sound: 'default',
        data: {
          type: payload.type,
          referenceId: payload.referenceId ?? null,
        },
      }));

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN && {
          Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
        }),
      };

      try {
        const res = await fetch(NotificationsService.EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(messages),
        });

        const parsed = await res.json().catch(() => ({ data: [] })) as { data?: Array<{ status?: string; details?: { error?: string } }> };
        const invalidTokenStrings: string[] = [];

        (parsed?.data ?? []).forEach((ticket, i) => {
          if (
            ticket.status === 'error' &&
            (ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.details?.error === 'InvalidCredentials')
          ) {
            invalidTokenStrings.push(tokens[i].token);
          }
        });

        if (invalidTokenStrings.length) {
          await this.deviceTokenRepository.update(
            { token: In(invalidTokenStrings) },
            { isActive: false },
          );
          this.logger.warn(`Bulk push: deactivated ${invalidTokenStrings.length} invalid tokens`);
        }
      } catch (err) {
        this.logger.error(`Bulk push batch failed`, err instanceof Error ? err.stack : undefined);
      }

      lastTokenId = tokens[tokens.length - 1].id;
    }

    this.logger.log(`Bulk push sent: type=${payload.type}`);
  }

  private async trySendPush(userId: number, notification: Notification) {
    const activeTokens = await this.deviceTokenRepository.find({
      where: { user: { id: userId }, isActive: true },
      order: { updatedAt: 'DESC' },
    });

    this.logger.log(
      `Order push candidate: user=${userId}, notification=${notification.id}, activeTokens=${activeTokens.length}`,
    );

    if (!activeTokens.length) {
      this.logger.log(`Skip push: no active device token for user=${userId}`);
      return;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };

    if (process.env.EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
    }

    for (let start = 0; start < activeTokens.length; start += NotificationsService.EXPO_PUSH_BATCH_SIZE) {
      const tokenBatch = activeTokens.slice(start, start + NotificationsService.EXPO_PUSH_BATCH_SIZE);
      const messageBatch = tokenBatch.map((deviceToken) => ({
        to: deviceToken.token,
        title: notification.title ?? 'FShop',
        body: notification.message ?? '',
        sound: 'default',
        data: {
          notificationId: notification.id,
          type: notification.type,
          referenceId: notification.referenceId ?? null,
        },
      }));

      try {
        this.logger.log(
          `Expo push send start: user=${userId}, notification=${notification.id}, batch=${start}, size=${messageBatch.length}`,
        );

        const response = await fetch(NotificationsService.EXPO_PUSH_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(messageBatch),
        });

        const responseText = await response.text();
        let parsed: { data?: Array<{ status?: string; details?: { error?: string } }> } | null = null;

        try {
          parsed = JSON.parse(responseText) as { data?: Array<{ status?: string; details?: { error?: string } }> };
        } catch {
          parsed = null;
        }

        if (!response.ok) {
          this.logger.warn(
            `Expo push request failed: status=${response.status}, user=${userId}, body=${responseText}`,
          );
          continue;
        }

        const tickets = parsed?.data ?? [];
        const okCount = tickets.filter((ticket) => ticket.status === 'ok').length;
        const errorTickets = tickets.filter((ticket) => ticket.status === 'error');
        this.logger.log(
          `Expo push tickets: user=${userId}, notification=${notification.id}, ok=${okCount}, errors=${errorTickets.length}`,
        );

        if (errorTickets.length) {
          this.logger.warn(
            `Expo push ticket errors: user=${userId}, notification=${notification.id}, errors=${JSON.stringify(
              errorTickets.map((ticket) => ticket.details?.error ?? 'unknown'),
            )}`,
          );
        }

        const invalidTokens: string[] = [];

        tickets.forEach((ticket, index) => {
          const isInvalidTokenError =
            ticket.status === 'error' &&
            (ticket.details?.error === 'DeviceNotRegistered' ||
              ticket.details?.error === 'InvalidCredentials');

          if (isInvalidTokenError) {
            invalidTokens.push(tokenBatch[index].token);
          }
        });

        if (invalidTokens.length) {
          await this.deviceTokenRepository.update(
            { token: In(invalidTokens) },
            { isActive: false },
          );

          this.logger.warn(
            `Deactivated invalid device tokens: count=${invalidTokens.length}, user=${userId}`,
          );
        }

        const now = new Date();
        await this.deviceTokenRepository.update(
          { id: In(tokenBatch.map((item) => item.id)) },
          { lastUsedAt: now },
        );
      } catch (error) {
        this.logger.error(
          `Expo push send failed: user=${userId}, batch=${start}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private maskToken(token: string) {
    if (token.length <= 10) {
      return token;
    }

    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }
}

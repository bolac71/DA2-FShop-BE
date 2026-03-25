import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification, User } from 'src/entities';
import { Repository } from 'typeorm';
import { NotificationGateway } from './notifications.gateway';
import { CreateNotificationDto, QueryNotificationDto } from './dtos';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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

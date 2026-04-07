/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageAttachment } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatGateway } from './chat.gateway';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly convoRepo: Repository<Conversation>,

    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    private readonly gateway: ChatGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // =========================
  // GET OR CREATE CONVERSATION
  // =========================
  async getOrCreateConversation(user: User) {
    const currentUser = await this.resolveAuthUser(user);

    let convo = await this.convoRepo.findOne({
      where: { customer: { id: currentUser.id } },
      relations: ['customer', 'assignedAdmin'],
    });

    if (!convo) {
      convo = this.convoRepo.create({
        customer: currentUser,
        status: 'OPEN',
      });
      await this.convoRepo.save(convo);
      this.gateway.emitConversationUpdate(convo);
    }

    return convo;
  }

  // =========================
  // SEND MESSAGE
  // =========================
  async sendMessage(
    dto: SendMessageDto,
    sender: User,
    files?: {
      images?: Express.Multer.File[];
      voice?: Express.Multer.File[];
      video?: Express.Multer.File[];
    }
  ) {
    const currentSender = await this.resolveAuthUser(sender);

    // 1. Validate: must have content OR files
    const hasContent = dto.content && dto.content.trim().length > 0;
    const hasFiles = files && (
      (files.images && files.images.length > 0) ||
      (files.voice && files.voice.length > 0) ||
      (files.video && files.video.length > 0)
    );
    const hasProducts = Array.isArray(dto.productIds) && dto.productIds.length > 0;

    if (!hasContent && !hasFiles && !hasProducts) {
      throw new HttpException('Message must have content or attachments', HttpStatus.BAD_REQUEST);
    }

    // 2. Existing validation (conversation, permissions)
    const convo = await this.convoRepo.findOne({
      where: { id: dto.conversationId },
      relations: ['customer', 'assignedAdmin'],
    });

    if (!convo) throw new HttpException('Conversation not found', HttpStatus.NOT_FOUND);

    // User chỉ được chat trong convo của mình
    if (currentSender.role === Role.USER && convo.customer.id !== currentSender.id) {
      throw new HttpException('You are not the owner of this conversation', HttpStatus.FORBIDDEN);
    }

    // 3. Upload files to Cloudinary
    const attachments: MessageAttachment[] = [];

    try {
      if (hasProducts) {
        const products = await this.productRepo.find({
          where: { id: In(dto.productIds ?? []) },
          relations: ['brand', 'category', 'images'],
        });

        const productMap = new Map(products.map((product) => [product.id, product]));

        (dto.productIds ?? []).forEach((productId) => {
          const product = productMap.get(productId);
          if (!product) {
            return;
          }

          attachments.push({
            type: 'product',
            product: {
              id: product.id,
              name: product.name,
              price: Number(product.price),
              imageUrl: product.images?.[0]?.imageUrl ?? null,
              brandName: product.brand?.name ?? null,
              categoryName: product.category?.name ?? null,
              department: product.category?.department ?? null,
            },
          });
        });
      }

      // Upload images
      if (files && files.images && files.images.length > 0) {
        const uploads = await Promise.all(
          files.images.map(f =>
            this.cloudinaryService.uploadFileToFolder(f, 'chat/images', 'image')
          )
        );

        uploads.forEach(upload => {
          if (upload) {
            attachments.push({
              type: 'image',
              url: upload.secure_url,
              publicId: upload.public_id,
              fileSize: upload.bytes,
              format: upload.format,
              dimensions: upload.width && upload.height ? {
                width: upload.width,
                height: upload.height,
              } : undefined,
            });
          }
        });
      }

      // Upload voice
      if (files && files.voice && files.voice.length > 0) {
        const upload = await this.cloudinaryService.uploadFileToFolder(
          files.voice[0],
          'chat/voice',
          'video' // audio uses 'video' resource_type in Cloudinary
        );

        if (upload) {
          attachments.push({
            type: 'voice',
            url: upload.secure_url,
            publicId: upload.public_id,
            fileName: files.voice[0].originalname,
            fileSize: upload.bytes,
            format: upload.format,
            duration: upload.duration,
          });
        }
      }

      // Upload video
      if (files && files.video && files.video.length > 0) {
        const upload = await this.cloudinaryService.uploadFileToFolder(
          files.video[0],
          'chat/videos',
          'video'
        );

        if (upload) {
          attachments.push({
            type: 'video',
            url: upload.secure_url,
            publicId: upload.public_id,
            fileName: files.video[0].originalname,
            fileSize: upload.bytes,
            format: upload.format,
            duration: upload.duration,
            dimensions: upload.width && upload.height ? {
              width: upload.width,
              height: upload.height,
            } : undefined,
          });
        }
      }
    } catch (error: any) {
      throw new HttpException(
        `Failed to upload attachments: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // 4. Create message
    const message = this.msgRepo.create({
      conversation: convo,
      sender: currentSender,
      senderRole: currentSender.role,
      content: dto.content || null,
      attachments: attachments.length > 0 ? attachments : null,
      isDelivered: true,
      isSeen: false,
    });

    const saved = await this.msgRepo.save(message);

    // 5. Update conversation (existing logic)
    convo.lastMessageAt = new Date();

    if (currentSender.role === Role.ADMIN) {
      convo.status = 'HANDLING';
      convo.assignedAdmin = currentSender;
    }

    await this.convoRepo.save(convo);
    this.gateway.emitConversationUpdate(convo);

    // 6. Build response DTO
    const messageDto = {
      id: saved.id,
      conversationId: convo.id,
      content: saved.content,
      attachments: saved.attachments,
      senderRole: saved.senderRole,
      sender: {
        id: currentSender.id,
        fullName: currentSender.fullName,
        avatar: currentSender.avatar,
        role: currentSender.role,
      },
      isSeen: saved.isSeen,
      createdAt: saved.createdAt,
    };

    // 7. Emit via WebSocket
    this.gateway.emitMessage(convo.id, messageDto);

    return messageDto;
  }

  // =========================
  // MARK SEEN
  // =========================
  async markSeen(conversationId: number) {
    await this.msgRepo.update(
      {
        conversation: { id: conversationId },
        isSeen: false,
      },
      { isSeen: true },
    );

    this.gateway.emitSeen(conversationId);
  }

  // =========================
  // GET MESSAGES
  // =========================
  async getMessages(conversationId: number) {
    const messages = await this.msgRepo.find({
      where: { conversation: { id: conversationId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages.map((m) => ({
      id: m.id,
      conversationId,
      content: m.content,
      attachments: m.attachments,
      senderRole: m.senderRole,
      sender: {
        id: m.sender.id,
        fullName: m.sender.fullName,
        avatar: m.sender.avatar,
        role: m.sender.role,
      },
      isSeen: m.isSeen,
      createdAt: m.createdAt,
    }));
  }

  // =========================
  // ADMIN GET ALL CONVERSATIONS
  // =========================
  async getAllConversations() {
    return this.convoRepo.find({
      relations: ['customer', 'assignedAdmin'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  private async resolveAuthUser(userLike: Partial<User> & { sub?: number; userId?: number }): Promise<User> {
    const rawUserId = userLike?.id ?? userLike?.sub ?? userLike?.userId;
    const userId = Number(rawUserId);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid authenticated user payload');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return user;
  }
}

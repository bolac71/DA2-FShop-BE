import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { User } from '../users/entities/user.entity';
import { CreateAiChatSessionDto, SendAiChatMessageDto } from './dtos';
import { AiChatMessage, AiChatSession } from './entities';

@Injectable()
export class AiChatbotService {
  constructor(
    @InjectRepository(AiChatSession)
    private readonly sessionRepo: Repository<AiChatSession>,
    @InjectRepository(AiChatMessage)
    private readonly messageRepo: Repository<AiChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly aiService: AiService,
  ) {}

  async createSession(userId: number, dto: CreateAiChatSessionDto) {
    const user = await this.requireUser(userId);

    const title = dto.title?.trim() ? dto.title.trim().slice(0, 120) : null;
    const session = this.sessionRepo.create({
      user,
      title,
      isActive: true,
      state: null,
    });

    return this.sessionRepo.save(session);
  }

  async listSessions(userId: number) {
    await this.requireUser(userId);

    return this.sessionRepo.find({
      where: {
        user: { id: userId },
        isActive: true,
      },
      order: {
        lastMessageAt: 'DESC',
      },
    });
  }

  async getMessages(userId: number, sessionId: number) {
    await this.getOwnedSession(userId, sessionId);

    return this.messageRepo.find({
      where: {
        session: { id: sessionId },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async closeSession(userId: number, sessionId: number) {
    const session = await this.getOwnedSession(userId, sessionId);
    session.isActive = false;
    return this.sessionRepo.save(session);
  }

  async sendMessage(userId: number, sessionId: number, dto: SendAiChatMessageDto) {
    const session = await this.getOwnedSession(userId, sessionId);
    const normalizedMessage = dto.message.trim();

    if (!normalizedMessage) {
      throw new HttpException('Message can not be empty', HttpStatus.BAD_REQUEST);
    }

    const historyLimit = dto.historyLimit ?? 12;
    const historyMessages = await this.messageRepo.find({
      where: {
        session: { id: sessionId },
      },
      order: {
        createdAt: 'DESC',
      },
      take: historyLimit,
    });

    const history = historyMessages
      .reverse()
      .map((item) => ({ role: item.role, content: item.content }));

    const userMessage = this.messageRepo.create({
      session,
      role: 'user',
      content: normalizedMessage,
      products: null,
      latencyMs: null,
    });
    const savedUserMessage = await this.messageRepo.save(userMessage);

    const startedAt = Date.now();
    const aiResult = await this.aiService.askChatbot(normalizedMessage, history, userId, session.state ?? null);
    const latencyMs = Date.now() - startedAt;

    const assistantMessage = this.messageRepo.create({
      session,
      role: 'assistant',
      content: aiResult.answer,
      products: aiResult.products,
      latencyMs,
    });
    const savedAssistantMessage = await this.messageRepo.save(assistantMessage);

    if (!session.title) {
      session.title = normalizedMessage.slice(0, 80);
    }
    if (aiResult.session_state) {
      session.state = aiResult.session_state as Record<string, unknown>;
    }
    session.lastMessageAt = new Date();
    await this.sessionRepo.save(session);

    return {
      sessionId: session.id,
      userMessage: savedUserMessage,
      assistantMessage: savedAssistantMessage,
      products: aiResult.products,
    };
  }

  private async requireUser(userId: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  private async getOwnedSession(userId: number, sessionId: number): Promise<AiChatSession> {
    const session = await this.sessionRepo.findOne({
      where: {
        id: sessionId,
        user: { id: userId },
        isActive: true,
      },
      relations: ['user'],
    });

    if (!session) {
      throw new HttpException('Chat session not found', HttpStatus.NOT_FOUND);
    }

    return session;
  }
}

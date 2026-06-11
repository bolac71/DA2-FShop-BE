import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AiChatProductItem } from '../ai/ai.service';
import { AiService } from '../ai/ai.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type { ImageSearchResultDto } from '../products/dtos';
import { Product } from '../products/entities/product.entity';
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
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly aiService: AiService,
    private readonly cloudinaryService: CloudinaryService,
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

  async deleteSession(userId: number, sessionId: number) {
    const result = await this.sessionRepo.delete({
      id: sessionId,
      user: { id: userId },
    });

    if (result.affected === 0) {
      throw new HttpException('Chat session not found', HttpStatus.NOT_FOUND);
    }

    return { deleted: true };
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

    // Resolve any products the user attached to ask about
    const attachedProducts = dto.productIds?.length
      ? await this.fetchProductsByIds(dto.productIds)
      : [];

    const userMessage = this.messageRepo.create({
      session,
      role: 'user',
      content: normalizedMessage,
      products: attachedProducts.length > 0 ? attachedProducts : null,
      latencyMs: null,
    });
    const savedUserMessage = await this.messageRepo.save(userMessage);

    // Augment the question + session state so the AI focuses on the attached products
    let aiQuestion = normalizedMessage;
    let aiState = session.state ?? null;
    if (attachedProducts.length > 0) {
      const contextLines = attachedProducts
        .map((p, i) => {
          const parts = [`${i + 1}. "${p.name}"`, `giá ${p.price}đ`];
          if (p.category) parts.push(`danh mục ${p.category}`);
          if (p.brand) parts.push(`thương hiệu ${p.brand}`);
          return `${parts.join(', ')} (ID: ${p.id})`;
        })
        .join('\n');
      aiQuestion = `${normalizedMessage}\n\n[Sản phẩm khách đính kèm để hỏi]:\n${contextLines}`;

      const first = attachedProducts[0];
      aiState = {
        ...(session.state ?? {}),
        active_product_id: first.id,
        active_product_name: first.name,
        active_category: first.category ?? null,
        active_brand: first.brand ?? null,
        last_product_ids: attachedProducts.map((p) => p.id),
      };
    }

    const startedAt = Date.now();
    const aiResult = await this.aiService.askChatbot(aiQuestion, history, userId, aiState);
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

  async imageSearch(userId: number, sessionId: number, fileBuffer: Buffer, fileName: string) {
    const session = await this.getOwnedSession(userId, sessionId);

    const [rawResults, uploadedImage] = await Promise.all([
      this.aiService.searchByImage(fileBuffer, fileName, 8),
      this.cloudinaryService.uploadBufferToFolder(fileBuffer, 'ai-chatbot/images'),
    ]);
    const products = await this.enrichProducts(rawResults);

    const userMessage = await this.messageRepo.save(
      this.messageRepo.create({
        session,
        role: 'user',
        content: '[Tìm kiếm sản phẩm bằng hình ảnh]',
        products: null,
        metadata: {
          mediaType: 'image',
          imageUri: uploadedImage.secure_url,
          imagePublicId: uploadedImage.public_id,
          fileName,
        },
        latencyMs: null,
      }),
    );

    const assistantContent = products.length > 0
      ? 'Dưới đây là các sản phẩm tương tự với hình ảnh bạn tìm kiếm:'
      : 'Tôi không tìm thấy sản phẩm nào đủ tương tự. Bạn thử gửi ảnh rõ hơn hoặc mô tả sản phẩm bằng văn bản nhé!';

    const assistantMessage = await this.messageRepo.save(
      this.messageRepo.create({ session, role: 'assistant', content: assistantContent, products, latencyMs: null }),
    );

    if (!session.title) session.title = 'Tìm kiếm bằng hình ảnh';
    session.lastMessageAt = new Date();
    await this.sessionRepo.save(session);

    return { sessionId: session.id, userMessage, assistantMessage, products };
  }

  async voiceSearch(userId: number, sessionId: number, fileBuffer: Buffer, fileName: string) {
    const session = await this.getOwnedSession(userId, sessionId);

    const result = await this.aiService.searchByVoice(fileBuffer, fileName);
    const products = await this.enrichProducts(result.products ?? []);

    const transcribedText = result.transcribed_text?.trim() || '[Giọng nói không rõ]';

    const userMessage = await this.messageRepo.save(
      this.messageRepo.create({ session, role: 'user', content: transcribedText, products: null, latencyMs: null }),
    );

    const assistantContent = products.length > 0
      ? `Tôi đã nghe: "${transcribedText}". Dưới đây là các sản phẩm phù hợp:`
      : `Tôi đã nghe: "${transcribedText}", nhưng không tìm thấy sản phẩm phù hợp. Bạn thử mô tả chi tiết hơn nhé!`;

    const assistantMessage = await this.messageRepo.save(
      this.messageRepo.create({ session, role: 'assistant', content: assistantContent, products, latencyMs: null }),
    );

    if (!session.title) session.title = transcribedText.slice(0, 80);
    session.lastMessageAt = new Date();
    await this.sessionRepo.save(session);

    return { sessionId: session.id, userMessage, assistantMessage, products };
  }

  private async enrichProducts(rawResults: ImageSearchResultDto[]): Promise<AiChatProductItem[]> {
    if (rawResults.length === 0) return [];

    const ids = rawResults.map((r) => r.product_id);
    const dbProducts = await this.productRepo.find({
      where: { id: In(ids), isActive: true },
      relations: ['brand', 'category', 'images', 'variants', 'variants.color', 'variants.size'],
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    return rawResults
      .flatMap((r) => {
        const p = productMap.get(r.product_id);
        if (!p) return [];
        const activeVariants = p.variants?.filter((variant) => variant.isActive) ?? [];
        const colors = Array.from(
          new Set(activeVariants.map((variant) => variant.color?.name).filter(Boolean) as string[]),
        );
        const sizes = Array.from(
          new Set(activeVariants.map((variant) => variant.size?.name).filter(Boolean) as string[]),
        );
        const categoryName = p.category?.name;
        const item: AiChatProductItem = {
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image_url: p.images?.find((img) => img.isActive)?.imageUrl ?? r.image_url,
          category: categoryName,
          brand: p.brand?.name,
          category_department: p.category?.department,
          colors,
          sizes,
          averageRating: Number(p.averageRating ?? 0),
          reviewCount: Number(p.reviewCount ?? 0),
        };
        return [item];
      });
  }

  private async fetchProductsByIds(ids: number[]): Promise<AiChatProductItem[]> {
    const uniqueIds = Array.from(new Set(ids)).filter((id) => Number.isInteger(id) && id > 0);
    if (uniqueIds.length === 0) return [];

    const dbProducts = await this.productRepo.find({
      where: { id: In(uniqueIds), isActive: true },
      relations: ['brand', 'category', 'images', 'variants', 'variants.color', 'variants.size'],
    });
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Preserve the order the user selected them
    return uniqueIds.flatMap((id) => {
      const p = productMap.get(id);
      if (!p) return [];
      const activeVariants = p.variants?.filter((variant) => variant.isActive) ?? [];
      const colors = Array.from(
        new Set(activeVariants.map((variant) => variant.color?.name).filter(Boolean) as string[]),
      );
      const sizes = Array.from(
        new Set(activeVariants.map((variant) => variant.size?.name).filter(Boolean) as string[]),
      );
      const item: AiChatProductItem = {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        image_url: p.images?.find((img) => img.isActive)?.imageUrl,
        category: p.category?.name,
        brand: p.brand?.name,
        category_department: p.category?.department,
        colors,
        sizes,
        averageRating: Number(p.averageRating ?? 0),
        reviewCount: Number(p.reviewCount ?? 0),
      };
      return [item];
    });
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

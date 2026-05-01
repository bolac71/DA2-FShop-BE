import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { UserInteraction, InteractionType } from './entities/user-interaction.entity';

@Injectable()
export class UserInteractionsService {
  constructor(
    @InjectRepository(UserInteraction)
    private readonly interactionRepository: Repository<UserInteraction>,
  ) {}

  private getScoreByType(type: InteractionType): number {
    switch (type) {
      case InteractionType.VIEW:
        return 1.0;
      case InteractionType.WISHLIST:
        return 3.0;
      case InteractionType.ADD_TO_CART:
        return 5.0;
      case InteractionType.PURCHASE:
        return 10.0;
      default:
        return 1.0;
    }
  }

  async recordInteraction(userId: number, productId: number, type: InteractionType) {
    const score = this.getScoreByType(type);
    
    // Check if interaction already exists recently to avoid duplicate scores
    const existing = await this.interactionRepository.findOne({
      where: {
        userId,
        productId,
        interactionType: type,
        createdAt: MoreThanOrEqual(new Date(Date.now() - 1000 * 60 * 60)), // Within last hour
      },
    });

    if (existing && type === InteractionType.VIEW) {
      // Don't record multiple views in an hour to avoid bias
      return;
    }

    const interaction = this.interactionRepository.create({
      userId,
      productId,
      interactionType: type,
      score,
    });
    console.log(`Recording interaction: user ${userId}, product ${productId}, type ${type}, score ${score}`);
    return this.interactionRepository.save(interaction);
  }

  async getRecentInteractions(userId: number, days: number = 30) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    return this.interactionRepository.find({
      where: {
        userId,
        createdAt: MoreThanOrEqual(dateLimit),
      },
      relations: ['product', 'product.images', 'product.brand', 'product.category'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}

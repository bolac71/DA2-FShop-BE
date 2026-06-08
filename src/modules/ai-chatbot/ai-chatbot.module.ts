import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AiChatbotController } from './ai-chatbot.controller';
import { AiChatbotService } from './ai-chatbot.service';
import { AiChatMessage, AiChatSession } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiChatSession, AiChatMessage, User, Product]),
    AiModule,
    CloudinaryModule,
  ],
  controllers: [AiChatbotController],
  providers: [AiChatbotService],
  exports: [AiChatbotService],
})
export class AiChatbotModule {}

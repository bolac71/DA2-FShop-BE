import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AiChatbotService } from './ai-chatbot.service';
import { CreateAiChatSessionDto, SendAiChatMessageDto } from './dtos';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
  };
};

@ApiTags('AI Chatbot')
@Controller('ai-chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiChatbotController {
  constructor(private readonly aiChatbotService: AiChatbotService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new AI chatbot session for the authenticated user' })
  createSession(@Req() req: AuthenticatedRequest, @Body() dto: CreateAiChatSessionDto) {
    const userId = req.user.sub;
    return this.aiChatbotService.createSession(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get active AI chatbot sessions of the authenticated user' })
  listSessions(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.aiChatbotService.listSessions(userId);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get message history in an AI chatbot session' })
  getMessages(@Req() req: AuthenticatedRequest, @Param('sessionId', ParseIntPipe) sessionId: number) {
    const userId = req.user.sub;
    return this.aiChatbotService.getMessages(userId, sessionId);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message to AI chatbot and persist both user/assistant messages' })
  sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SendAiChatMessageDto,
  ) {
    const userId = req.user.sub;
    return this.aiChatbotService.sendMessage(userId, sessionId, dto);
  }

  @Patch('sessions/:sessionId/close')
  @ApiOperation({ summary: 'Close an AI chatbot session' })
  closeSession(@Req() req: AuthenticatedRequest, @Param('sessionId', ParseIntPipe) sessionId: number) {
    const userId = req.user.sub;
    return this.aiChatbotService.closeSession(userId, sessionId);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Hard-delete an AI chatbot session and all its messages' })
  deleteSession(@Req() req: AuthenticatedRequest, @Param('sessionId', ParseIntPipe) sessionId: number) {
    const userId = req.user.sub;
    return this.aiChatbotService.deleteSession(userId, sessionId);
  }

  @Post('sessions/:sessionId/image-search')
  @ApiOperation({ summary: 'Search products by image within a chatbot session' })
  @UseInterceptors(FileInterceptor('file'))
  imageSearch(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');
    const userId = req.user.sub;
    return this.aiChatbotService.imageSearch(userId, sessionId, file.buffer, file.originalname);
  }

  @Post('sessions/:sessionId/voice-search')
  @ApiOperation({ summary: 'Search products by voice within a chatbot session' })
  @UseInterceptors(FileInterceptor('file'))
  voiceSearch(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Audio file is required');
    const userId = req.user.sub;
    return this.aiChatbotService.voiceSearch(userId, sessionId, file.buffer, file.originalname);
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BadRequestException, Body, Controller, Get, HttpException, HttpStatus, Param, Post, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SendMessageDto } from './dto/send-message.dto';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly service: ChatsService) {}

  @Post('conversation')
  @ApiOperation({ summary: 'Get or create conversation for the authenticated user' })
  @ApiBearerAuth()
  getOrCreate(@Req() req) {
    return this.service.getOrCreateConversation(req['user']);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiBearerAuth()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 5 },
        { name: 'voice', maxCount: 1 },
        { name: 'video', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 50 * 1024 * 1024, // 50MB
        },
        fileFilter: (req, file, callback) => {
          const allowedMimes = {
            images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            voice: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg'],
            video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
          };

          const fieldMimes = allowedMimes[file.fieldname];
          if (!fieldMimes || !fieldMimes.includes(file.mimetype)) {
            return callback(
              new HttpException(
                `File type not allowed. Allowed types: ${fieldMimes.join(', ')}`,
                HttpStatus.BAD_REQUEST
              ),
              false
            );
          }
          callback(null, true);
        },
      }
    )
  )
  send(
    @Body() dto: SendMessageDto,
    @UploadedFiles() files: {
      images?: Express.Multer.File[];
      voice?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
    @Req() req
  ) {
    return this.service.sendMessage(dto, req['user'], files);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  @ApiBearerAuth()
  @ApiNotFoundResponse({ description: 'Conversation not found' })
  getMessages(@Param('id') id: number) {
    return this.service.getMessages(Number(id));
  }

  @Post('seen/:id')
  @ApiOperation({ summary: 'Mark a conversation as seen' })
  @ApiBearerAuth()
  seen(@Param('id') id: number) {
    return this.service.markSeen(id);
  }

  @Get('admin/conversations')
  @ApiOperation({ summary: 'Get all conversations (admin only)' })
  @ApiBearerAuth()
  getAll() {
    return this.service.getAllConversations();
  }
}

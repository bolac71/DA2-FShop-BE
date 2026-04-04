/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LivestreamsService } from './livestreams.service';
import { CreateLivestreamCommentDto } from './dtos';

@WebSocketGateway({ cors: { origin: '*' } })
export class LivestreamsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LivestreamsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly livestreamService: LivestreamsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      const token = typeof rawToken === 'string' ? rawToken : undefined;

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const extractedUserId = payload?.sub ?? payload?.userId;
      const userId = Number(extractedUserId);

      if (!Number.isFinite(userId) || userId <= 0) {
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.data.livestreamRooms = new Set<number>();
      this.logger.log(`Livestream socket connected user=${userId} socket=${client.id}`);
    } catch (error) {
      this.logger.warn(`Socket auth failed socket=${client.id}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = Number(client.data?.userId);
    const rooms = client.data?.livestreamRooms as Set<number> | undefined;

    if (!Number.isFinite(userId) || !rooms) {
      return;
    }

    for (const livestreamId of rooms) {
      await this.livestreamService.removeViewer(livestreamId, userId, client.id);
      const viewerCount = await this.livestreamService.getViewerCount(livestreamId);
      this.server
        .to(`livestream-${livestreamId}`)
        .emit('viewerCountUpdated', { livestreamId, viewerCount });
    }
  }

  @SubscribeMessage('joinLivestream')
  async joinLivestream(
    @MessageBody() body: { livestreamId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = Number(client.data.userId);
    const livestreamId = Number(body?.livestreamId);
    if (!Number.isInteger(livestreamId) || livestreamId <= 0) {
      return;
    }

    const room = `livestream-${livestreamId}`;
    client.join(room);
    (client.data.livestreamRooms as Set<number>).add(livestreamId);

    await this.livestreamService.addViewer(livestreamId, userId, client.id);
    const viewerCount = await this.livestreamService.getViewerCount(livestreamId);
    this.server.to(room).emit('viewerCountUpdated', { livestreamId, viewerCount });
  }

  @SubscribeMessage('leaveLivestream')
  async leaveLivestream(
    @MessageBody() body: { livestreamId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = Number(client.data.userId);
    const livestreamId = Number(body?.livestreamId);
    if (!Number.isInteger(livestreamId) || livestreamId <= 0) {
      return;
    }

    const room = `livestream-${livestreamId}`;
    client.leave(room);
    (client.data.livestreamRooms as Set<number>).delete(livestreamId);

    await this.livestreamService.removeViewer(livestreamId, userId, client.id);
    const viewerCount = await this.livestreamService.getViewerCount(livestreamId);
    this.server.to(room).emit('viewerCountUpdated', { livestreamId, viewerCount });
  }

  @SubscribeMessage('livestreamComment')
  async livestreamComment(
    @MessageBody() body: { livestreamId: number; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = Number(client.data.userId);
    const livestreamId = Number(body?.livestreamId);
    if (!Number.isInteger(livestreamId) || livestreamId <= 0) {
      return;
    }

    const dto: CreateLivestreamCommentDto = { content: body.content };
    const comment = await this.livestreamService.addComment(livestreamId, userId, dto);

    this.emitNewComment(livestreamId, comment);
  }

  emitNewComment(livestreamId: number, comment: unknown) {
    this.server.to(`livestream-${livestreamId}`).emit('newLivestreamComment', comment);
  }
}

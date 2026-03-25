/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from "socket.io";

@WebSocketGateway({cors: { origin: '*' }})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private jwtService: JwtService, private configService: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      // 1. Extract token from query or headers
      const rawToken = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      const token = typeof rawToken === 'string' ? rawToken : undefined;

      if (!token) {
        this.logger.warn(`Socket ${client.id} missing token, disconnecting`);
        return client.disconnect();
      }

      // 2. Verify token
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      // 3. Extract userId from payload
      const userId = payload?.sub ?? payload?.userId;
      if (!userId) {
        this.logger.warn(`Socket ${client.id} token payload missing user id, disconnecting`);
        return client.disconnect();
      }
      client.data.userId = userId;

      // 4. Join user room
      client.join(`user_${userId}`);
      this.logger.log(`Socket connected: user=${userId}, socket=${client.id}, room=user_${userId}`);
    }
    catch (err) {
      this.logger.warn(`Socket ${client.id} token invalid, disconnecting`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    this.logger.log(`Socket disconnected: user=${userId ?? 'unknown'}, socket=${client.id}`);

    this.server.emit('user-left', {
      message: `User ${client.id} has left the chat`,
    })
  }

  sendToUser(userId: number, data: any) {
    this.logger.log(`Emit notification_received: user=${userId}, notificationId=${data?.id ?? 'unknown'}`);
    this.server.to(`user_${userId}`).emit('notification_received', data);
  }
}
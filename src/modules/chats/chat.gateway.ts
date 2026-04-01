import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class ChatGateway {
  @WebSocketServer()
  server: Server;
  @SubscribeMessage('leaveConversation')
  leave(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(`conversation-${conversationId}`);
  }

  @SubscribeMessage('joinConversation')
  join(
    @MessageBody() conversationId: number,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`conversation-${conversationId}`);
  }

  @SubscribeMessage('typing')
  typing(
    @MessageBody()
    data: { conversationId: number; userId: number; isTyping: boolean },
    @ConnectedSocket() socket: Socket,
  ) {
    socket.to(`conversation-${data.conversationId}`).emit('typing', data);
  }

  emitMessage(conversationId: number, message: any) {
    this.server
      .to(`conversation-${conversationId}`)
      .emit('newMessage', message);
  }

  emitSeen(conversationId: number) {
    this.server.to(`conversation-${conversationId}`).emit('seen');
  }

  emitConversationUpdate(payload: any) {
    this.server.emit('conversationUpdated', payload);
  }
}

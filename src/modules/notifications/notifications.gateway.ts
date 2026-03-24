/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Socket, Server } from "socket.io";

@WebSocketGateway({cors: { origin: '*' }})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId;
    if (userId) {
      client.join(`user_${userId}`);
      console.log(`Client ${client.id} joined room: user_${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log("Client disconnected: " + client.id);

    this.server.emit('user-left', {
      message: `User ${client.id} has left the chat`,
    })
  }

  sendToUser(userId: number, data: any) {
    this.server.to(`user_${userId}`).emit('notification_received', data);
  }
}
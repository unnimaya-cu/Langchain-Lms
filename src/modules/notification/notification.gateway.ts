import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseFilters } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Types } from 'mongoose';
import { AllWsExceptionsFilter } from 'src/common/websockets/ws-exception.filter';

@Injectable()
@UseFilters(new AllWsExceptionsFilter())
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://main.d1hhmap7x29mpz.amplifyapp.com',
      'https://minbarapp.com',
      'https://dev.minbarapp.com',
    ],
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationService: NotificationService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected  ${client.id}`);
    // console.log(
    //   `Client connected  ${client.id}, ${client?.data?.user}`,
    // );
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ): string {
    console.log('Received message:', payload);
    return 'Hello world! notification socket connected successfully!';
  }

  async sendNotification(notificationId: string) {
    try {
      if (!Types.ObjectId.isValid(notificationId)) {
        throw new Error('Invalid notification ID');
      }

      const { data: notification, err } =
        await this.notificationService.createNotificationForUser(
          notificationId,
        );

      if (err || !notification) {
        throw new Error('Failed to create notification for users');
      }

      this.server.emit('newCourseNotification', { message: notification });
    } catch (error) {
      console.error('Error sending notification:', error.message);
    }
  }

  async sendNotificationToUser(notificationId: string, userIds: string[], message?: string, createNew?: boolean) {
    try {
      if (!Types.ObjectId.isValid(notificationId)) {
        throw new Error('Invalid notification ID');
      }

      const { data: notification, err } =
        await this.notificationService.assignNotificationToUsers(
          notificationId,
          userIds,
          message,
          createNew || false
        );

      if (err || !notification) {
        throw new Error('Failed to create notification for users');
      }

      this.server.emit('newCourseNotification', { message: notification });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

}

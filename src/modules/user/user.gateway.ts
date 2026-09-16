import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: 'auth',
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
@Injectable()
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(UserGateway.name);
  private userMap = new Map<string, string>();

  constructor(private configService: ConfigService) {}
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const payload: any = jwt.verify(token, this.configService.get<string>('JWT_SECRET'));

      client.data.user = payload;
      this.userMap.set(payload.sub, client.id);

      this.logger.log(`User ${payload.sub} connected to ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [uid, sid] of this.userMap.entries()) {
      if (sid === client.id) this.userMap.delete(uid);
    }
  }

  forceLogout(userId: string, reason = 'Logged out') {
    const socketId = this.userMap.get(userId);
    if (!socketId) return;

    const sockets = this.server.sockets as unknown as Map<string, Socket>;

    const socket = sockets.get(socketId);

    if (socket) {
      socket.emit('force-logout', { reason });
      socket.disconnect(true);
    }
  }
}

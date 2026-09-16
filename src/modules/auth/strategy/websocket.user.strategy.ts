import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
// import { Reflector } from '@nestjs/core';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private config: ConfigService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();

      let token = client.handshake.auth?.token;

      if (!token) {
        token = client.handshake?.query?.token as string;
      }
      // console.log('Extracted Token:', token);

      if (!token) {
        throw new WsException('Missing token');
      }

      const secret = this.config.get('JWT_SECRET');
      const decoded = this.jwt.verify(token, { secret });

      client.data.user = decoded;

      // console.log('userid iss websocket', decoded);
      return true;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }
}

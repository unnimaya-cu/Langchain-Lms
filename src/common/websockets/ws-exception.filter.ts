import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class AllWsExceptionsFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(AllWsExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const error = this.normalizeError(exception);

    this.logger.error(
      `WebSocket Error: ${error.message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const callback = host.getArgByIndex(2);

    // Send standardized error response
    client.emit('exception', {
      status: 'error',
      message: error.message,
      code: this.getErrorCode(exception),
      timestamp: new Date().toISOString(),
      path: this.getHandlerName(host),
    });

    if (typeof callback === 'function') {
      callback(error);
    }
  }

  private normalizeError(exception: unknown): { message: string } {
    if (exception instanceof WsException) {
      return { message: exception.message };
    }
    if (exception instanceof Error) {
      return { message: exception.message };
    }
    if (typeof exception === 'string') {
      return { message: exception };
    }
    return { message: 'Internal server error' };
  }

  private getErrorCode(exception: unknown): string {
    if (exception instanceof WsException) {
      return (exception as any).code || 'WS_ERROR';
    }
    if (exception instanceof Error && 'code' in exception) {
      return (exception as any).code;
    }
    return 'INTERNAL_SERVER_ERROR';
  }

  private getHandlerName(host: ArgumentsHost): string {
    try {
      const pattern = host.getArgByIndex(1)?.[0] || 'unknown';
      return typeof pattern === 'string' ? pattern : 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

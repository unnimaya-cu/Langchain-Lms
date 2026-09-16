import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChapterVideoCommentService } from './chapter-video-comment.service';
import {
  ReplyCommentDto,
  VideoCommentDto,
} from './dto/chaptervideo-comment.dto';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from '../auth/strategy/websocket.user.strategy';
import { AllWsExceptionsFilter } from 'src/common/websockets/ws-exception.filter';
// import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';
import { Types } from 'mongoose';
@UseFilters(new AllWsExceptionsFilter())
@WebSocketGateway({
  namespace: 'api',
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
export class ChapterVideoCommentGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChapterVideoCommentGateway.name);
  private usermap = new Map();
  @WebSocketServer()
  server: Server;
  constructor(
    private readonly videoCommentService: ChapterVideoCommentService,
    private readonly notificationService: NotificationService,
  ) {}

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    // console.log('usermap logged first', Array.from(this.usermap.entries()));

    const user = client.data.user;
    // console.log('pingggg', user.sub, client.id);
    this.usermap.set(user.sub, client.id);
    // console.log('usermap inside ping', Array.from(this.usermap.entries()));
    // return { msg: "pong from user" ${user.sub} };
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client Connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.usermap.entries()) {
      if (socketId === client.id) {
        this.usermap.delete(userId);
        break;
      }
    }
    this.logger.log(`Client Disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('getComments')
  async handleGetComments(
    @MessageBody() videoId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }

      client.join(videoId);
      const comments =
        await this.videoCommentService.getCommentsByVideoId(videoId);
      client.emit('getComments', comments);
    } catch (error) {
      this.logger.error(`Error getting comments: ${error.message}`);
      client.emit('error', { message: 'Failed to get comments' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendComment')
  async handleSendComment(
    @MessageBody() dto: VideoCommentDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.user?.sub;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const comment = await this.videoCommentService.createComment(dto, userId);
      if (comment) {
        this.server.to(dto.videoId).emit('receiveComment', comment);
        const comments = await this.videoCommentService.getCommentsByVideoId(
          dto.videoId,
        );
        this.server.to(dto.videoId).emit('getComments', comments);
      }
      return comment;
    } catch (error) {
      this.logger.error(`Error sending comment: ${error.message}`);
      client.emit('error', { message: 'Failed to send comment' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('upvoteComment')
  async handleUpvote(
    @MessageBody() commentId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    const updatedComment = await this.videoCommentService.upVoteComment(
      commentId,
      userId,
    );

    // this.server.emit('commentUpdated', updatedComment);
    // console.log('updateeed', updatedComment);

    if (updatedComment) {
      this.server.emit('getUpdatedupvote', {
        commentId,
        upVoteCount: updatedComment.upVotes.length,
      });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('downvoteComment')
  async handleDownvote(
    @MessageBody() commentId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    const updatedComment = await this.videoCommentService.downVoteComment(
      commentId,
      userId,
    );
    // this.server.emit('commentUpdated', updatedComment);
    if (updatedComment) {
      this.server.emit('getUpdatedDownvote', {
        commentId,
        downVoteCount: updatedComment.downVotes.length,
      });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendReply')
  async handleSendReply(
    @MessageBody() dto: ReplyCommentDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    const newReply = await this.videoCommentService.replyComment(dto, userId);

    // console.log('replycomment', newReply);

    const clientid = this.usermap.get(newReply?.originalId.toString());
    // console.log('clientid is ise', clientid);
    // console.log('usermap isss', this.usermap);

    // await this.notificationGateway.sendReplyCommentNotification(
    // newReply?._id.toString(),
    // userId,
    // clientid
    // );
    this.server.emit(`reply-${dto.parentId}`, newReply);

    const { data: notificationData, err } =
      await this.notificationService.notifyCommentReply(
        new Types.ObjectId(newReply?._id),
        // newReply?._id.toString(),
        userId,
      );

    if (err || !notificationData) {
      throw new Error(err || 'Failed to create reply notification');
    }
    this.server.to(clientid).emit('replyCommentNotification', {
      message: notificationData,
      panel: 'user',
    });
    return newReply;
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('getReplies')
  async handleGetReplies(@MessageBody() parentId: string) {
    const replies = await this.videoCommentService.getReplies(parentId);
    this.server.emit('replies', { parentId, replies });
  }
}

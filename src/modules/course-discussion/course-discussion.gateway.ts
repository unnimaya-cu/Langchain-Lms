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
import { CourseDiscussionService } from './course-discussion.service';
import {
  CourseDiscussionDto,
  ReplyDiscussionDto,
} from './dto/course-discussion.dto';
import { Logger, UseFilters, UseGuards } from '@nestjs/common';
import { WsJwtAuthGuard } from '../auth/strategy/websocket.user.strategy';
import { AllWsExceptionsFilter } from 'src/common/websockets/ws-exception.filter';
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
export class CourseDiscussionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(CourseDiscussionGateway.name);
  private usermap = new Map();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly courseDiscussionService: CourseDiscussionService,
    private readonly notificationService: NotificationService,
  ) {}

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const user = client.data.user;
    this.usermap.set(user.sub, client.id);
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized for Course Discussions');
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
  @SubscribeMessage('getCourseDiscussions')
  async handleGetCourseDiscussions(
    @MessageBody() courseId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!courseId) {
        throw new Error('Course ID is required');
      }

      client.join(courseId);
      const discussions =
        await this.courseDiscussionService.getDiscussionsByCourseId(courseId);
      client.emit('getCourseDiscussions', discussions);
    } catch (error) {
      this.logger.error(`Error getting discussions: ${error.message}`);
      client.emit('error', { message: 'Failed to get course discussions' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendCourseDiscussion')
  async handleSendCourseDiscussion(
    @MessageBody() dto: CourseDiscussionDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = client.data.user?.sub;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const post = await this.courseDiscussionService.createDiscussion(dto, userId);
      if (post) {
        this.server.to(dto.courseId).emit('receiveCourseDiscussion', post);
        const discussions = await this.courseDiscussionService.getDiscussionsByCourseId(
          dto.courseId,
        );
        this.server.to(dto.courseId).emit('getCourseDiscussions', discussions);
      }
      return post;
    } catch (error) {
      this.logger.error(`Error sending discussion post: ${error.message}`);
      client.emit('error', { message: 'Failed to send discussion post' });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('upvoteCourseDiscussion')
  async handleUpvote(
    @MessageBody() discussionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    const updatedPost = await this.courseDiscussionService.upVoteDiscussion(
      discussionId,
      userId,
    );

    if (updatedPost) {
      this.server
        .to(updatedPost.courseId.toString())
        .emit('getCourseDiscussionUpdatedupvote', {
          discussionId,
          upVoteCount: updatedPost.upVotes.length,
        });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('downvoteCourseDiscussion')
  async handleDownvote(
    @MessageBody() discussionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    const updatedPost = await this.courseDiscussionService.downVoteDiscussion(
      discussionId,
      userId,
    );

    if (updatedPost) {
      this.server
        .to(updatedPost.courseId.toString())
        .emit('getCourseDiscussionUpdatedDownvote', {
          discussionId,
          downVoteCount: updatedPost.downVotes.length,
        });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendCourseDiscussionReply')
  async handleSendReply(
    @MessageBody() dto: ReplyDiscussionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.sub;
    const newReply = await this.courseDiscussionService.replyDiscussion(dto, userId);

    this.server.emit(`course-discussion-reply-${dto.parentId}`, newReply);

    const clientid = this.usermap.get(newReply?.originalId?.toString());

    const { data: notificationData, err } =
      await this.notificationService.notifyDiscussionReply(
        new Types.ObjectId(newReply?._id),
        userId,
      );

    if (!err && notificationData && clientid) {
      this.server.to(clientid).emit('replyCommentNotification', {
        message: notificationData,
        panel: 'user',
      });
    }

    return newReply;
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('getCourseDiscussionReplies')
  async handleGetReplies(@MessageBody() parentId: string) {
    const replies = await this.courseDiscussionService.getReplies(parentId);
    this.server.emit('courseDiscussionReplies', { parentId, replies });
  }
}

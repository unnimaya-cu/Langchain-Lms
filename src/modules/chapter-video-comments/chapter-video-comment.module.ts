import { Module } from '@nestjs/common';
import { ChapterVideoCommentService } from './chapter-video-comment.service';
import { ChapterVideoCommentGateway } from './chapter-video-comment.gateway';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from '../notification/notification.service';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { ChapterVideoCommentController } from './chapter-video-comment.controller';

@Module({
    imports:[MongodbModule,NotificationModule,UserModule],
    controllers:[ChapterVideoCommentController],
    providers: [ChapterVideoCommentGateway, ChapterVideoCommentService,JwtService,NotificationService],
})
export class ChapterVideoCommentModule {}

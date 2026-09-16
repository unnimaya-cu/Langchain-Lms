import { Module } from '@nestjs/common';
import { CourseDiscussionController } from './course-discussion.controller';
import { CourseDiscussionService } from './course-discussion.service';
import { CourseDiscussionGateway } from './course-discussion.gateway';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { JwtService } from '@nestjs/jwt';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [MongodbModule, NotificationModule, UserModule],
  controllers: [CourseDiscussionController],
  providers: [
    CourseDiscussionService,
    CourseDiscussionGateway,
    JwtService,
  ],
  exports: [CourseDiscussionService],
})
export class CourseDiscussionModule {}

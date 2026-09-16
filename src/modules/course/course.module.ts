import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { MiscService } from '../misc/misc.service';
import { RatingreviewService } from '../user/userRatingReview/ratingreview.service';
import { CoursemoduleService } from '../coursemodule/coursemodule.service';
import { ChapterService } from '../chapter/chapter.service';
import { ChaptercontentService } from '../chaptercontent/chaptercontent.service';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentQuestionsService } from '../assessment-questions/assessment-questions.service';
import { AnswerOptionsService } from '../answer-options/answer-options.service';
import { ChapterVideoService } from '../chapter-video/chapter-video.service';
import { ChapterModule } from '../chapter/chapter.module';
import { NotificationService } from '../notification/notification.service';
// import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [MongodbModule,ChapterModule,NotificationModule,UserModule],
  providers: [
    CourseService,
    MiscService,
    RatingreviewService,
    CoursemoduleService,

    CoursemoduleService,
    ChapterService,
    ChaptercontentService,
    AssessmentService,
    AssessmentQuestionsService,
    AnswerOptionsService,
    ChapterVideoService,NotificationService, JwtService
  ],
  controllers: [CourseController],
})
export class CourseModule {}

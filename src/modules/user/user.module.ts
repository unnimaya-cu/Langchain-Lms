import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { MiscModule } from '../misc/misc.module';
// import { MiscService } from '../misc/misc.service';
import { SubmissionService } from './submission/submission.service';
import { SubmissionController } from './submission/submission.controller';
import { AssessmentModule } from '../assessment/assessment.module';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentQuestionsService } from '../assessment-questions/assessment-questions.service';
import { UsercoursesService } from './userCourses/usercourses.service';
import { UsercoursesController } from './userCourses/usercourses.controller';
import { WishlistService } from './wishlist/wishlist.service';
import { WishlistController } from './wishlist/wishlist.controller';
import { ChapterModule } from '../chapter/chapter.module';
import { ChapterService } from '../chapter/chapter.service';
import { ChaptercontentService } from '../chaptercontent/chaptercontent.service';
import { ChapterVideoService } from '../chapter-video/chapter-video.service';
import { RatingreviewService } from './userRatingReview/ratingreview.service';
import { RatingreviewController } from './userRatingReview/ratingreview.conroller';
import { UserGateway } from './user.gateway';
import { NotificationModule } from '../notification/notification.module';
import { Notification, notificationSchema } from '../notification/schema/notification.schema';
import { Course, CourseSchema } from '../course/schema/course.schema';
import { MongooseModule } from '@nestjs/mongoose';


@Module({
  imports: [
    MongooseModule.forFeature([
        {name: Notification.name, schema: notificationSchema},
        {name: Course.name, schema: CourseSchema},
      ]),
    MongodbModule, MiscModule, AssessmentModule, ChapterModule, forwardRef(() => NotificationModule)],
  providers: [
    UserService,
    SubmissionService,
    AssessmentService,
    AssessmentQuestionsService,
    UsercoursesService,
    WishlistService,
    ChapterService,
    ChaptercontentService,
    ChapterVideoService,
    RatingreviewService,
    UserGateway,
  ],
  controllers: [
    UserController,
    SubmissionController,
    UsercoursesController,
    WishlistController,
    RatingreviewController
  ],
  exports: [UserService, UserGateway]
})
export class UserModule {}

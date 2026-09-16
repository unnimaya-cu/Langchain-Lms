import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AnswerOptionSchema } from 'src/modules/answer-options/schema/answer-option.schema';
import { AssessmentQuestionSchema } from 'src/modules/assessment-questions/schema/assessment-question.schema';
import { AssessmentSchema } from 'src/modules/assessment/schema/assessment.schema';
import { CategorySchema } from 'src/modules/category/schema/category.schema';
import { VideoChapterSchema } from 'src/modules/chapter-video/schema/chapterVidoe.schema';
import { ChapterSchema } from 'src/modules/chapter/schema/chapter.schema';
import { ChapterContentSchema } from 'src/modules/chaptercontent/schema/chaptercontent.schema';
import { CourseSchema } from 'src/modules/course/schema/course.schema';
import { CourseModuleSchema } from 'src/modules/coursemodule/schema/coursemodule.schema';
import { CounterSchema } from 'src/modules/misc/schema/counter.schema';

import { RoleSchema } from 'src/modules/role/schema/role.schema';
import { UserSchema } from 'src/modules/user/schema/user.schema';
import { SubmissionSchema } from 'src/modules/user/submission/schema/submission.schema';
import { UserCoursesSchema } from 'src/modules/user/userCourses/schema/usercourses.schema';
import { UserCourseChapterSchema } from 'src/modules/user/userCourseChapters/schema/usercourseschapters.schema';
import { WishlistSchema } from 'src/modules/user/wishlist/schema/wishlist.schema';
import { RatingReviewSchema } from 'src/modules/user/userRatingReview/schema/ratingreview.schema';
import { VideoCommentSchema } from 'src/modules/chapter-video-comments/schema/chaptervideo-comment.schema';
import { VideoNoteSchema } from 'src/modules/chapter-video-notes/schema/chaptervideo-note.schema';
import { notificationSchema } from 'src/modules/notification/schema/notification.schema';
import { userNotificationSchema } from 'src/modules/notification/schema/userNotificationManagement.schema';
import { SubscribeSchema } from 'src/modules/subscribe/schema/subscribe.schema';
import { CourseAssessmentSchema } from 'src/modules/course-assessment/schema/course-assessment.schema';
import { CourseDiscussionSchema } from 'src/modules/course-discussion/schema/course-discussion.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // replicaSet: "rs0",
        // w: "majority",
        // authSource:"admin",
        serverSelectionTimeoutMS: 60000,
        connectionFactory: (connection) => {
          connection.on('error', (error) => {
            console.error('MongoBd  connection error:', error);
          });
          return connection;
        },
      }),
      // useFactory: (configService: ConfigService) => ({
      //   uri: configService.get<string>("MONGODB_URI"),
      //   replicaSet: "rs0",
      //   w: "majority",
      //   authSource: "admin",
      //   serverSelectionTimeoutMS: 120000, // Increase timeout to 2 minutes
      //   connectionFactory: (connection) => {
      //     connection.on("error", (error) => {
      //       console.error("MongoDB connection error:", error);
      //     });
      //     return connection;
      //   },
      // }),
    }),
    MongooseModule.forFeature([{ name: 'Role', schema: RoleSchema }]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    MongooseModule.forFeature([{ name: 'Counter', schema: CounterSchema }]),
    MongooseModule.forFeature([{ name: 'Course', schema: CourseSchema }]),
    MongooseModule.forFeature([
      { name: 'CourseModule', schema: CourseModuleSchema },
    ]),
    MongooseModule.forFeature([{ name: 'Category', schema: CategorySchema }]),
    MongooseModule.forFeature([
      { name: 'ChapterContent', schema: ChapterContentSchema },
    ]),
    MongooseModule.forFeature([{ name: 'Chapter', schema: ChapterSchema }]),
    MongooseModule.forFeature([
      { name: 'Assessment', schema: AssessmentSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'AssessmentQuestion', schema: AssessmentQuestionSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'AnswerOption', schema: AnswerOptionSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'Submission', schema: SubmissionSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'VideoChapter', schema: VideoChapterSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'UserCourses', schema: UserCoursesSchema },
    ]),
    MongooseModule.forFeature([{ name: 'Wishlist', schema: WishlistSchema }]),
    MongooseModule.forFeature([
      { name: 'UserCourseChapter', schema: UserCourseChapterSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'RatingReview', schema: RatingReviewSchema },
    ]),

    MongooseModule.forFeature([
      { name: 'VideoComment', schema: VideoCommentSchema },
    ]),
    MongooseModule.forFeature([{ name: 'VideoNote', schema: VideoNoteSchema }]),

    MongooseModule.forFeature([
      { name: 'Notification', schema: notificationSchema },
    ]),
    MongooseModule.forFeature([
      {
        name: 'UserNotification',
        schema: userNotificationSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: 'Subscribe',
        schema: SubscribeSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name:'CourseAssessment',
        schema:CourseAssessmentSchema
      }
    ]),
    MongooseModule.forFeature([
      {
        name: 'CourseDiscussion',
        schema: CourseDiscussionSchema
      }
    ])
  ],
  exports: [MongooseModule],
})
export class MongodbModule {}

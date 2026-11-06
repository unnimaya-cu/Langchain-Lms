import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { LogService } from './modules/log/log.service';
import { LogModule } from './modules/log/log.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { MongodbModule } from './database/mongodb/mongodb.module';
import { LogController } from './modules/log/log.controller';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Log, LogSchema } from './modules/log/log.schema';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleService } from './modules/role/role.service';
import { RoleModule } from './modules/role/role.module';
import { JwtService } from '@nestjs/jwt';
import { MiscService } from './modules/misc/misc.service';
import { MiscModule } from './modules/misc/misc.module';
import { EmailModule } from './modules/email/email.module';
import { CategoryModule } from './modules/category/category.module';
import { EmailService } from './modules/email/email.service';
import { CourseModule } from './modules/course/course.module';
import { CoursemoduleService } from './modules/coursemodule/coursemodule.service';
import { CoursemoduleModule } from './modules/coursemodule/coursemodule.module';
import { UserService } from './modules/user/user.service';
import { ChapterService } from './modules/chapter/chapter.service';
import { ChapterModule } from './modules/chapter/chapter.module';
import { ChaptercontentService } from './modules/chaptercontent/chaptercontent.service';
// import { ChaptercontentModule } from './modules/chaptercontent/chaptercontent.module';
import { AssessmentService } from './modules/assessment/assessment.service';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { AssessmentQuestionsService } from './modules/assessment-questions/assessment-questions.service';
import { AssessmentQuestionsModule } from './modules/assessment-questions/assessment-questions.module';
import { AnswerOptionsService } from './modules/answer-options/answer-options.service';
import { AnswerOptionsController } from './modules/answer-options/answer-options.controller';
import { AnswerOptionsModule } from './modules/answer-options/answer-options.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { ChapterVideoService } from './modules/chapter-video/chapter-video.service';
import { ChapterVideoModule } from './modules/chapter-video/chapter-video.module';
import { AdmindashboardModule } from './modules/admindashboard/admindashboard.module';
import { ChapterVideoCommentService } from './modules/chapter-video-comments/chapter-video-comment.service';
import { ChapterVideoCommentModule } from './modules/chapter-video-comments/chapter-video-comment.module';
import { CourseDiscussionModule } from './modules/course-discussion/course-discussion.module';

import { ChapterVideoNotesService } from './modules/chapter-video-notes/chapter-video-notes.service';
import { ChapterVideoNotesModule } from './modules/chapter-video-notes/chapter-video-notes.module';
import { NotificationService } from './modules/notification/notification.service';
import { NotificationModule } from './modules/notification/notification.module';

import { SeedModule } from './database/seed/seed.module';
import { SubscribeService } from './modules/subscribe/subscribe.service';
import { SubscribeModule } from './modules/subscribe/subscribe.module';
import { CourseAssessmentController } from './modules/course-assessment/course-assessment.controller';
import { CourseAssessmentService } from './modules/course-assessment/course-assessment.service';
import { CourseAssessmentModule } from './modules/course-assessment/course-assessment.module';

import { QuestionBankController } from './modules/question-bank/question-bank.controller';
import { QuestionBankService } from './modules/question-bank/question-bank.service';
import { QuestionBankModule } from './modules/question-bank/question-bank.module';
import { StudentAssessmentModule } from './modules/student-assessment/student-assessment.module';
import { GroupModule } from './modules/group/group.module';
import { StudentSubmissionModule } from './modules/student-submission/student-submission.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { RedisModule } from './redis/redis.module';
import { CourseReminderService } from './modules/reminders/course-reminder/course-reminder.service';
import { CourseReminderModule } from './modules/reminders/course-reminder/course-reminder.module';
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    SchedulerModule,
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
    LogModule,
    MongodbModule,
    AuthModule,
    UserModule,
    RoleModule,
    MiscModule,
    EmailModule,
    CategoryModule,
    CourseModule,
    CoursemoduleModule,
    ChapterModule,
    AssessmentModule,
    AssessmentQuestionsModule,
    AnswerOptionsModule,
    FileUploadModule,
    ChapterVideoModule,
    AdmindashboardModule,
    ChapterVideoCommentModule,
    CourseDiscussionModule,
    ChapterVideoNotesModule,
    NotificationModule,
    SeedModule,
    SubscribeModule,
    CourseAssessmentModule,
    QuestionBankModule,
    StudentAssessmentModule,
    GroupModule,
    StudentSubmissionModule,
    ChatbotModule,
    RedisModule,
    CourseReminderModule,
  ],
  controllers: [
    AppController,
    LogController,
    AuthController,
    AnswerOptionsController,
    CourseAssessmentController,
    QuestionBankController,
  ],
  providers: [
    AppService,
    LogService,
    JwtService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    AuthService,
    UserService,
    RoleService,
    MiscService,
    EmailService,
    CoursemoduleService,
    ChapterService,
    ChaptercontentService,
    AssessmentService,
    AssessmentQuestionsService,
    AnswerOptionsService,
    ChapterVideoService,
    ChapterVideoCommentService,
    ChapterVideoNotesService,
    NotificationService,
    SubscribeService,
    CourseAssessmentService,
    QuestionBankService,
    CourseReminderService,
    // ChapterVideoDiscussionGateway
  ],
})
export class AppModule { }

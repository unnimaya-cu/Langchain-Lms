import { Module } from '@nestjs/common';
import { StudentSubmissionService } from './student-submission.service';
import { StudentSubmissionController } from './student-submission.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentSubmission, StudentSubmissionSchema } from './schema/student-submission.schema';
import { CourseAssessmentModule } from '../course-assessment/course-assessment.module';
import { StudentAssessmentModule } from '../student-assessment/student-assessment.module';
import { UserModule } from '../user/user.module';
import { User, UserSchema } from '../user/schema/user.schema';
import { GroupModule } from '../group/group.module';
import { Group, GroupSchema } from '../group/schema/group.schema';
import { NotificationModule } from '../notification/notification.module';
import { Notification, notificationSchema } from '../notification/schema/notification.schema';
import { UserCourses, UserCoursesSchema } from '../user/userCourses/schema/usercourses.schema';
import { Course, CourseSchema } from '../course/schema/course.schema';
import { CourseModule, CourseModuleSchema } from '../coursemodule/schema/coursemodule.schema';
import { Chapter, ChapterSchema } from '../chapter/schema/chapter.schema';
import { UserCourseChapter, UserCourseChapterSchema } from '../user/userCourseChapters/schema/usercourseschapters.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: StudentSubmission.name, schema: StudentSubmissionSchema},
      {name: User.name, schema: UserSchema},
      {name: Group.name, schema: GroupSchema},
      {name: Notification.name, schema: notificationSchema},
      {name: UserCourses.name, schema: UserCoursesSchema},
      {name: Course.name, schema: CourseSchema},
      {name: CourseModule.name, schema: CourseModuleSchema},
      {name: Chapter.name, schema: ChapterSchema},
      {name: UserCourseChapter.name, schema: UserCourseChapterSchema},
    ]),
    CourseAssessmentModule,
    StudentAssessmentModule,
    UserModule,
    GroupModule,
    NotificationModule
  ],
  controllers: [StudentSubmissionController],
  providers: [StudentSubmissionService],
  exports: [StudentSubmissionService]
})
export class StudentSubmissionModule {}

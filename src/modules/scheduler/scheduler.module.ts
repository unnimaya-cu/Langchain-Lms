import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { StudentAssessment, StudentAssessmentSchema } from '../student-assessment/schema/create-student-assessment.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { notificationSchema, Notification } from '../notification/schema/notification.schema';
import { NotificationModule, } from '../notification/notification.module';
import { StudentSubmission, StudentSubmissionSchema } from '../student-submission/schema/student-submission.schema';
import { CourseAssessment, CourseAssessmentSchema } from '../course-assessment/schema/course-assessment.schema';
import { StudentSubmissionModule } from '../student-submission/student-submission.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: StudentAssessment.name, schema: StudentAssessmentSchema},
      {name: Notification.name, schema: notificationSchema},
      {name: StudentSubmission.name, schema: StudentSubmissionSchema},
      {name: CourseAssessment.name, schema: CourseAssessmentSchema},
    ]),
    NotificationModule,
    StudentSubmissionModule
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}

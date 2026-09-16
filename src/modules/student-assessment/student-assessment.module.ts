import { Module } from '@nestjs/common';
import { StudentAssessmentService } from './student-assessment.service';
import { StudentAssessmentController } from './student-assessment.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentAssessment, StudentAssessmentSchema } from './schema/create-student-assessment.schema';
import { GroupModule } from '../group/group.module';
import { CourseAssessmentModule } from '../course-assessment/course-assessment.module';
import { NotificationModule } from '../notification/notification.module';
import { Notification, notificationSchema } from '../notification/schema/notification.schema';
import { UserModule } from '../user/user.module';
import { User, UserSchema } from '../user/schema/user.schema';
import { StudentSubmission, StudentSubmissionSchema } from '../student-submission/schema/student-submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: StudentAssessment.name, schema: StudentAssessmentSchema},
      {name: Notification.name, schema: notificationSchema},
      {name: User.name, schema: UserSchema},
      {name: StudentSubmission.name, schema: StudentSubmissionSchema},
    ]),
    GroupModule,
    CourseAssessmentModule,
    NotificationModule,
    UserModule
  ],
  controllers: [StudentAssessmentController],
  providers: [StudentAssessmentService],
  exports:[MongooseModule]
})
export class StudentAssessmentModule {}

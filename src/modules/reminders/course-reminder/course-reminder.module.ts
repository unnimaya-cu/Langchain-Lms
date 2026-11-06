import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserCourses, UserCoursesSchema } from 'src/modules/user/userCourses/schema/usercourses.schema';
import { CourseReminderService } from './course-reminder.service';
import { CourseReminderController } from './course-reminder.controller';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
      imports: [
    MongooseModule.forFeature([
      {
        name: UserCourses.name,
        schema: UserCoursesSchema,
      },
    ]),
    NotificationModule,
  ],
  providers: [CourseReminderService],
  exports: [CourseReminderService],
  controllers: [CourseReminderController],
})
export class CourseReminderModule {}

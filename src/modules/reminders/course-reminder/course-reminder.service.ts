import { SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserCourses } from 'src/modules/user/userCourses/schema/usercourses.schema';
import { NotificationService } from 'src/modules/notification/notification.service';

@Injectable()
export class CourseReminderService {
  private readonly logger = new Logger(CourseReminderService.name);

  private readonly ses = new SESClient({
    region: process.env.AWS_REGION,
  });
  constructor(
    @InjectModel(UserCourses.name)
    private readonly enrollmentModel: Model<UserCourses>,
    private readonly notificationService: NotificationService,
  ) {}

  async findInactiveStudents() {
    // Calculate the time 4 days ago.
    const cutoff = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

    // Find enrollments with no recent activity.
    const enrollments = await this.enrollmentModel
      .find({
        courseStatus: 'INPROGRESS',
        lastActivityAt: { $lte: cutoff },
      })
      .populate('userId', 'firstName lastName email lastLogin status')
      .populate('courseId', 'title')
      .exec();

    let sent = 0;
    let failed = 0;

    for (const enrollment of enrollments) {
      try {
        const student: any = enrollment.userId;
        const course: any = enrollment.courseId;

        if (!student?.email || !course?.title) {
          this.logger.warn(
            `Missing email or course title for ${enrollment._id}`,
          );
          failed++;
          continue;
        }

        await this.ses.send(
          new SendEmailCommand({
            Source: process.env.SES_FROM_EMAIL!,
            Destination: {
              ToAddresses: [student.email],
            },
            Message: {
              Subject: {
                Data: `Continue learning: ${course.title}`,
              },
              Body: {
                Text: {
                  Data:
                    `Hi ${student.name ?? 'Student'},\n\n` +
                    `You haven't been active in ` +
                    `${course.title} for at least 4 days.\n` +
                    `Log in to your LMS and continue learning!\n\n` +
                    `Happy learning!`,
                },
              },
            },
          }),
        );

        // Send live notification to inactive student
        if (student?._id && course?._id) {
          await this.notificationService.createCourseReminder(
            student._id.toString(),
            course._id.toString(),
            course.title,
          );
        }

        // Update only after SES accepts the email request.
        await this.enrollmentModel.updateOne(
          { _id: enrollment._id },
          {
            $set: {
              lastReminderSentAt: new Date(),
            },
          },
        );

        sent++;
      } catch (error) {
        failed++;

        this.logger.error(
          `Reminder failed for enrollment ${enrollment._id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    console.log(`Found ${enrollments.length} inactive enrollments`);

    return enrollments.map((enrollment: any) => {
      const user = enrollment.userId;
      const course = enrollment.courseId;

      return {
        userid: user?._id ?? null,
        firstname: user?.firstName ?? '',
        lastname: user?.lastName ?? '',
        email: user?.email ?? '',
        lastlogin: user?.lastLogin ?? null,
        status: user?.status ?? '',
        courseid: course?._id ?? null,
        title: course?.title ?? '',
        courseStatus: enrollment.courseStatus,
        lastActivityAt: enrollment.lastActivityAt,
        lastReminderSentAt: enrollment.lastReminderSentAt,
      };
    });
  }
}

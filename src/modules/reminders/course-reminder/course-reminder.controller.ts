import { Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { CourseReminderService } from './course-reminder.service';
import { ConfigService } from '@nestjs/config';

@Controller('course-reminder')
export class CourseReminderController {
constructor(
    private readonly reminderService: CourseReminderService,
      private readonly configService: ConfigService,
  ) {}
  @Get('test-inactive')
  async testInactiveStudents() {
    const enrollments =
      await this.reminderService.findInactiveStudents();

    return {
      count: enrollments.length,
      enrollments,
    };
  }

  @Post('course-inactivity')
  async runCourseReminders(
    @Headers('x-scheduler-secret') secret: string,
  ) {
    const expectedSecret = this.configService.get<string>(
      'SCHEDULER_SECRET',
    );

    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException();
    }

    return this.reminderService.findInactiveStudents();
  }
}

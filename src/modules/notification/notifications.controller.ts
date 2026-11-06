import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @UseGuards(AuthGuard(['user', 'admin']))
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllNotifications(@getUser() user) {
    // console.log(user.userId, 'userId from getAllNotifications');

    const response = await this.notificationService.getAllNotificationsForUser(
      user.userId,
    );
    const data = Array.isArray(response) ? response : response.data;
    const err = !Array.isArray(response) ? response.err : null;
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard(['admin']))
  @Get('getallnotify')
  @HttpCode(HttpStatus.OK)
  async getAllNotificationsAdmin(
    // @Query('startIndex') startIndex: number,
    // @Query('noOfItems') noOfItems: number,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @getUser() user,
    @Query('search') search: string,
    @Query('filter') filter: string,
  ) {
    try {
      console.log('User ID:', user);
      const { data, err } = await this.notificationService.getAllNotificationsForAdmin(page, limit,user.userId, search, filter);
      //const data = Array.isArray(response) ? response : response.data;
      // return responseBuilder(true, {
      //   list: response.data,
      //  // totalCount: response.data.totalCount,
      // });
      return responseBuilder(true, data);
    } catch (err) {
      return errorResponseBuilder(err);
    }
  }

  @UseGuards(AuthGuard(['user', 'admin']))
  @Put('mark-as-read')
  @HttpCode(HttpStatus.OK)
  async markUserNotificationAsRead(
    @Body('notificationId') notificationId: string,
    @getUser() user,
  ) {
    try {
      console.log('Marking notification as read:', notificationId);
      console.log('User ID:', user);
      const { data, err } =
        await this.notificationService.markOneUserNotificationAsRead(
          user.userId,
          notificationId,
        );

      if (err) {
        return errorResponseBuilder({
          message: err || 'Unknown error',
          type: 'NotificationError',
          err,
        });
        // Handle errors properly
      }

      return responseBuilder(true, data); // Return success response
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return errorResponseBuilder('Internal Server Error');
    }
  }
  // @UseGuards(AuthGuard('admin'))
  // @Put('mark-as-reads')
  // @HttpCode(HttpStatus.OK)
  // async markAdminNotificationAsRead(
  //   @Body('notificationId') notificationId: string,
  //   @getUser() user,
  // ) {
  //   try {
  //     console.log('Marking notification as read:', notificationId);
  //     console.log('User ID:', user);

  //     const { data, err } =
  //       await this.notificationService.markOneAdminNotificationAsRead(
  //         user.userId,
  //         notificationId,
  //       );

  //     if (err) {
  //       return errorResponseBuilder(err); // Handle errors properly
  //     }

  //     return responseBuilder(true, data); // Return success response
  //   } catch (error) {
  //     console.error('Error marking notification as read:', error);
  //     return errorResponseBuilder('Internal Server Error');
  //   }
  // }

  @UseGuards(AuthGuard('user')) // or 'jwt' depending on your setup
  @Put('mark-all-as-read')
  @HttpCode(HttpStatus.OK)
  async markAllUserNotificationsAsRead(@getUser() user) {
    try {
      const { data, err } =
        await this.notificationService.markAllUserNotificationsAsRead(
          user.userId,
        );

      if (err) {
        return errorResponseBuilder(err);
      }

      return responseBuilder(true, data);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return errorResponseBuilder('Internal Server Error');
    }
  }

  @UseGuards(AuthGuard(['user']))
  @Get('reply-comments')
  @HttpCode(HttpStatus.OK)
  async getAllReplyCommentsNotification(@getUser() user) {
    const { data, err } = await this.notificationService.getAllReplyCommentNotifications(user.userId)
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Post('test-course-reminder')
  @HttpCode(HttpStatus.OK)
  async testNotification(
    @Body()
    body: {
      studentId: string;
      courseId: string;
      courseTitle: string;
      customDeduplicationKey?: string;
    },
  ) {
    const alreadyExists = await this.notificationService.hasInactiveCourseReminder(
      body.studentId,
      body.courseId,
    );

    const notification = await this.notificationService.createCourseReminder(
      body.studentId,
      body.courseId,
      body.courseTitle,
      body.customDeduplicationKey,
    );

    return responseBuilder(true, {
      isDuplicate: alreadyExists,
      message: alreadyExists
        ? 'Reminder has already been created previously for this student and inactive course. Duplicate prevented!'
        : 'New inactive course reminder notification successfully created.',
      notification,
    });
  }

  @Get('test-course-reminder/check')
  @HttpCode(HttpStatus.OK)
  async checkReminderExists(
    @Query('studentId') studentId: string,
    @Query('courseId') courseId: string,
    // @getUser() user,
  ) {
    if (!studentId || !courseId) {
      return errorResponseBuilder('studentId and courseId query parameters are required.');
    }

    const exists = await this.notificationService.hasInactiveCourseReminder(
      studentId,
      courseId,
    );

    return responseBuilder(true, {
      studentId,
      courseId,
      hasReminder: exists,
    });
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationType } from 'src/common/enum/notification-type.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, enum: ['course_completion', 'new_course', 'new_comment', 'general', 'comment_reply', 'assign_assessment', 'assessment_graded', 'assessment_reminder', 'grade_reminder', 'course_discussion_reply'] })
  type: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'courses',
    required: function () {
      return this.type === NotificationType.NEW_COURSE || this.type === NotificationType.NEW_COMMENT;
    },
  })
  courseId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VideoChapter',
    required: function () {
      return this.type === NotificationType.NEW_COMMENT;
    },
  })
  videoId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VideoComment',
    required: function (this: Notification) {
      return this.type === NotificationType.NEW_COMMENT || this.type === NotificationType.COMMENT_REPLY;
    },
  })
  commentId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CourseDiscussion',
    required: function (this: Notification) {
      return this.type === NotificationType.COURSE_DISCUSSION_REPLY;
    },
  })
  discussionId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: function (this: Notification) {
      return this.type === NotificationType.COMMENT_REPLY || this.type === NotificationType.COURSE_DISCUSSION_REPLY;
    },
  })
  replierUserId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'CourseAssessment',
    // required: function (this: Notification) {
    //   return this.type === NotificationType.ASSIGN_ASSESSMENT
    // },
  })
  assessmentId?: Types.ObjectId;

  @Prop({ type: String })
  message?: string;
}

export const notificationSchema = SchemaFactory.createForClass(Notification);

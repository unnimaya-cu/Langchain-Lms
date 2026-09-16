import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';

@Schema({ timestamps: true })
export class CourseAssessment {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: StatusType;

  @Prop({
    type: String,
    required: true,
    enum: ['quiz', 'assignment', 'project', 'peer_review'],
  })
  assessmentType: string;

  // @Prop({ type: String })
  // duration?: string;

  // @Prop({ type: Number, min: 1 })
  // timeLimitMinutes?: number;

  // @Prop({ type: Date })
  // startTime?: Date;

  // @Prop({ type: Date })
  // endTime?: Date;

  // @Prop({ type: Boolean, default: false })
  // shuffleQuestions: boolean;

  @Prop({ type: Boolean, default: false })
  shuffleChoices: boolean;

  // @Prop({ type: Number, min: 1, default: 1 })
  // maxAttempts: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop([Object])
  questions: [object];

  @Prop({type:Boolean, default: false})
  isGradeReminderSent: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    default: [],
  })
  groupIds: Types.ObjectId[];

  @Prop({
    type: {
      // Availability
      enableSubmissionFrom: { type: Boolean, default: false },
      submissionFrom: { type: Date },
      enableDueDate: { type: Boolean, default: false },
      dueDate: { type: Date },
      enableLastSubmissionDate: { type: Boolean, default: false },
      lastSubmissionDate: { type: Date },
      enableGradeReminder: { type: Boolean, default: false },
      gradeReminderDate: { type: Date },

      // Submission Settings
      requireSubmitButton: { type: Boolean, default: true },
      allowedAttempts: { type: Number, default: 1 },

      // Notifications
      notifyStudentOnAssignment: { type: Boolean, default: true },
      notifyStudentOnGrading: { type: Boolean, default: true },
      notifyStudentOnReminder: { type: Boolean, default: true },

      // Grades
      maximumGrade: { type: Number, default: 100 },
      hideGraderIdentity: { type: Boolean, default: false },

      // Completion
      completionCondition: {
        type: String,
        enum: ['none', 'manual'],
        default: 'none',
      },
      enableTimelineReminder: { type: Boolean, default: false },
      timelineReminderDate: { type: Date },
    },
    default: {},
  })
  instructions: {
    enableSubmissionFrom: boolean;
    submissionFrom?: Date;
    enableDueDate: boolean;
    dueDate?: Date;
    enableLastSubmissionDate: boolean;
    lastSubmissionDate?: Date;
    enableGradeReminder: boolean;
    gradeReminderDate?: Date;

    requireSubmitButton: boolean;
    allowedAttempts: number;

    notifyStudentOnAssignment: boolean;
    notifyStudentOnGrading: boolean;
    notifyStudentOnReminder: boolean;

    maximumGrade: number;
    hideGraderIdentity: boolean;

    completionCondition: 'none' | 'manual';
    enableTimelineReminder: boolean;
    timelineReminderDate?: Date;
  };

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;
}
export const CourseAssessmentSchema =
  SchemaFactory.createForClass(CourseAssessment);

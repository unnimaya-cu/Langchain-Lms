import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';
import { StudentAssessmentStatus } from 'src/common/enum/student-assessment-status';

@Schema({ timestamps: true })
export class StudentAssessment {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true })
  courseId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseAssessment',
    required: true,
  })
  assessmentId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  studentId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null })
  groupId: string;

  @Prop({ type: Boolean, default: false })
  isFromGroup: boolean;

  @Prop({
    type: String,
    enum: StudentAssessmentStatus,
    default: StudentAssessmentStatus.PENDING,
  })
  submissionStatus: string;

  @Prop({
    type: String,
    enum: StatusType,
    default: StatusType.ACTIVE,
  })
  status: string;

  @Prop({ type: Number })
  duration: number;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop({ type: Boolean, default: false })
  reminderSent: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;
}
export const StudentAssessmentSchema = SchemaFactory.createForClass(StudentAssessment);
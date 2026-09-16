import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { PaymentStatusType } from 'src/common/enum/paymentstatus-type.enum';
import { StatusType } from 'src/common/enum/status-type.enum';

export type CourseModuleDocument = CourseModule & Document;
@Schema({ timestamps: true })
export class CourseModule {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description: string;

  @Prop({ type: String })
  duration: string;

  @Prop({ type: Number })
  moduleOrder: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course' })
  courseId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isPublished: boolean;

  @Prop({
    type: String,
    enum: PaymentStatusType,
    default: PaymentStatusType.FREE,
  })
  isPaid: PaymentStatusType;

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: StatusType;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}
export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);

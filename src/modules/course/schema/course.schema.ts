import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { CourseLevel } from 'src/common/enum/courseLevel.enum';
import { CourseStatusType } from 'src/common/enum/coursestatus-type.enum';
import { PaymentStatusType } from 'src/common/enum/paymentstatus-type.enum';
import { StatusType } from 'src/common/enum/status-type.enum';

export type CourseDocument = Course & Document;
@Schema({ timestamps: true })
export class Course {
  @Prop({ type: String, required: true, unique: true })
  courseCode: string;

  @Prop({ type: String, required: true})
  title: string;

  @Prop({ type: String})
  description: string;

  @Prop({ type: String })
  courseImg: string;

  @Prop({ type: String })
  coverImg: string;

  @Prop({
    type: [
      {
        previewType: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    default: [],
  })
  preview: { previewType: string; url: string }[];

  // @Prop({ type: String, required: true })
  // videoUrl: string

  @Prop({ type: Number, default: 0 })
  price: number;

  // @Prop({ type: Number, default: 0 })
  // discount: number;

  @Prop({
    type: String,
    required: true,
    enum: PaymentStatusType,
    default: PaymentStatusType.FREE,
  })
  isPaid: PaymentStatusType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  categoryId: Types.ObjectId;

  @Prop({ type: [String] })
  modules: string[];

  @Prop({ required: true, enum: CourseLevel })
  courseLevel: CourseLevel;

  @Prop({ type: Types.ObjectId, ref: 'Review', default: null })
  rating: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isPublished: boolean;

  @Prop({
    type: String,
    enum: CourseStatusType,
    default: CourseStatusType.ACTIVE,
  })
  status: StatusType;

  @Prop({ type: [String], default: [] })
  courseTags: string[];

  @Prop({ type: [String], default: [] })
  skillsGain: string[];

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}
export const CourseSchema = SchemaFactory.createForClass(Course);

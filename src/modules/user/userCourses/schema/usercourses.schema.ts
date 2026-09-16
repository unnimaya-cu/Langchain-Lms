import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserCourses {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  purchasedDate: Date;

  @Prop({type:Number,default:0 })
  progressPercentage:number

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  // @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  // updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ default: 0 })
  learningTimeSeconds: number;
}
export const UserCoursesSchema = SchemaFactory.createForClass(UserCourses);

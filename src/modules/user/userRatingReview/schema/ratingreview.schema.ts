import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { FeedbackStatus } from 'src/common/enum/feeback.enum';

@Schema({ timestamps: true })
export class RatingReview {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({type:Number,required:true, min:1, max:5 })
  rating:number

  @Prop({type:String})
  review:string

  @Prop({type:String})
  reply:string

  @Prop({type:String, enum: FeedbackStatus})
  previousState:FeedbackStatus

  @Prop({ type: Date})
  repliedOn: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
  
  @Prop({type:String, enum: FeedbackStatus, default: FeedbackStatus.AWAITING})
  status: FeedbackStatus;

  //   @Prop({ type: Date, default: Date.now })
  //   updatedAt: Date;
}
export const RatingReviewSchema = SchemaFactory.createForClass(RatingReview);

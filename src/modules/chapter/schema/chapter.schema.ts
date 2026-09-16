import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { ChapterType } from 'src/common/enum/chapter-type.enum';
import { StatusType } from 'src/common/enum/status-type.enum';

export type ChapterDocument = Chapter & Document;
@Schema({ timestamps: true })
export class Chapter {
  // @Prop({ type: String, required: true, unique: true })
  // title: string;

  @Prop({type:mongoose.Schema.Types.ObjectId, ref:'CourseModule',required: true,})
  moduleId:Types.ObjectId

  @Prop({type:mongoose.Schema.Types.ObjectId, ref:'ChapterContent',default:null })
  contentId:Types.ObjectId

  // @Prop({type:Types.ObjectId, ref:'ChapterContent'})
  // videoId:Types.ObjectId
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VideoChapter', default: null })
  videoId: Types.ObjectId;

  @Prop({type:mongoose.Schema.Types.ObjectId, ref:'Assessment',default:null })
  assessmentId:Types.ObjectId

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CourseAssessment', default: null })
  courseAssessmentId: Types.ObjectId

  @Prop({type:Number, })
  orderNumber:number

  @Prop({type:String, enum:ChapterType ,required: true, })
  chapterType:ChapterType

  @Prop({
    type: String,
    enum: StatusType,
    default: StatusType.ACTIVE,
  })
  status: StatusType;

  @Prop({type: Number})
  durationInSec: number;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User',default: null  })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}
export const ChapterSchema = SchemaFactory.createForClass(Chapter);



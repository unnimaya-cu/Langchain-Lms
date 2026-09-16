import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';

@Schema({ timestamps: true })
export class VideoChapter extends Document {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String })
  description: string;

  duration: string;

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: StatusType;

  @Prop({ type: [String], default: [] })
  materials: string[];

  @Prop({ type: String })
  videocontent: string;

  //   @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: string; // Types.ObjectId;

  //   @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: string; //Types.ObjectId;

  @Prop({ type: String, required: true })
  videoUrl: string;
}

export const VideoChapterSchema = SchemaFactory.createForClass(VideoChapter);

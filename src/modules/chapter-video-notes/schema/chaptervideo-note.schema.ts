import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

@Schema({ timestamps: true })
export class VideoNote {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VideoChapter',required: true })
  videoId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({type:Number , required:true})
  timeDuration:number

  @Prop({type:String , required:true})
  description:string

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

}
export const VideoNoteSchema = SchemaFactory.createForClass(VideoNote);

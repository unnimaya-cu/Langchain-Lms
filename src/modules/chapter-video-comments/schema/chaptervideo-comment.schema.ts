import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { CommentStatus } from 'src/common/enum/comment.enum';

@Schema({ timestamps: true })
export class VideoComment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VideoChapter',  })
  videoId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({type:String , })
  comment:string

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  upVotes:Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  downVotes:Types.ObjectId[];

  @Prop({ type:mongoose.Schema.Types.ObjectId,ref: 'VideoComment',default: null   })
  parentId: Types.ObjectId

  // @Prop({ type: [{ type: Types.ObjectId, ref: 'VideoComment' }], default: [] })
  // replies: Types.ObjectId[]; 

  @Prop({type:String})
  reply:string
  
  @Prop({type:String, enum: CommentStatus})
  previousState:CommentStatus
  
  @Prop({ type: Date})
  repliedOn: Date;
  
  @Prop({type:String, enum: CommentStatus, default: CommentStatus.AWAITING})
  status: CommentStatus;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

}
export const VideoCommentSchema = SchemaFactory.createForClass(VideoComment);

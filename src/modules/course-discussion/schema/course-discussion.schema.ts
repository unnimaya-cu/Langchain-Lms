import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { CommentStatus } from 'src/common/enum/comment.enum';

@Schema({ timestamps: true })
export class CourseDiscussion {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  upVotes: Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  downVotes: Types.ObjectId[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'CourseDiscussion', default: null })
  parentId: Types.ObjectId;

  @Prop({ type: String })
  reply: string;

  @Prop({ type: String, enum: CommentStatus })
  previousState: CommentStatus;

  @Prop({ type: Date })
  repliedOn: Date;

  @Prop({ type: String, enum: CommentStatus, default: CommentStatus.AWAITING })
  status: CommentStatus;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CourseDiscussionSchema = SchemaFactory.createForClass(CourseDiscussion);

// Indexes for the hot query paths: listing threads by course and fetching replies.
CourseDiscussionSchema.index({ courseId: 1, parentId: 1 });
CourseDiscussionSchema.index({ parentId: 1 });

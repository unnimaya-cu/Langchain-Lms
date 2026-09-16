import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { UserChapterStatusType } from 'src/common/enum/userchapterstatus-type.enum';

@Schema({ timestamps: true })
export class UserCourseChapter {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserCourses', required: true })
  userCourseId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', required: true })
  chapterId: Types.ObjectId;

  @Prop({
    type: String,
    enum: UserChapterStatusType,
    default: UserChapterStatusType.PENDING,
  })
  status: UserChapterStatusType;

  @Prop({type:Boolean, default: false})
  isCompleted: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserCourseChapterSchema =
  SchemaFactory.createForClass(UserCourseChapter);

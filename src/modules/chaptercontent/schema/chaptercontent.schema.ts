import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';

@Schema({ timestamps: true })
export class ChapterContent {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: StatusType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}
export const ChapterContentSchema =
  SchemaFactory.createForClass(ChapterContent);

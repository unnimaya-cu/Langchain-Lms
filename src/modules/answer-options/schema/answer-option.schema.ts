import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';

@Schema({ timestamps: true })
export class AnswerOption {
  @Prop({ type: String, required: true,  })
  optionName: string;

  @Prop({ type: Boolean, required: true })
  correctAnswer: boolean

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
export const AnswerOptionSchema =
  SchemaFactory.createForClass(AnswerOption);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { StatusType } from 'src/common/enum/status-type.enum';
import { AnswerOption } from 'src/modules/answer-options/schema/answer-option.schema';

@Schema({ timestamps: true })
export class AssessmentQuestion {
  @Prop({ type: String, required: true,  })
  questionTitle: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true })
  assessmentId: Types.ObjectId;

  @Prop({required:true})
  options: [AnswerOption]

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
export const AssessmentQuestionSchema =
  SchemaFactory.createForClass(AssessmentQuestion);

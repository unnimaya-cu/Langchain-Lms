import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { DifficultyType } from 'src/common/enum/difficulty-type.enum';
import { QuestionType } from 'src/common/enum/question-type.enum';
import { QuestionStatus } from 'src/common/enum/question-status.enum';
import { StatusType } from 'src/common/enum/status-type.enum';
import { GradingMethod } from 'src/common/enum/grading-method';
@Schema({ discriminatorKey: 'questionType', timestamps: true })
export class QuestionBank {
  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', 
    // required: true 
  })
  courseId: Types.ObjectId;

  @Prop({ type: String, required: true })
  questionName: string;

  @Prop({ type: String, required: true })
  questionText: string;

  @Prop({ type: String})
  idNumber: string;

  @Prop({
    type: String,
    enum: QuestionType,
    default: QuestionType.MCQ,
    required: true,
  })
  questionType: QuestionType;

  @Prop({ type: String, enum: DifficultyType, default: DifficultyType.EASY })
  difficulty: DifficultyType;

  @Prop({ type: Boolean })
  showInstructions: boolean; // not needed

  @Prop({ type: String })
  instructions: string;

  @Prop({ type: String })
  source: string;

  @Prop({ type: String })
  questionCode: string;

  @Prop({ type: String, enum: GradingMethod })
  gradingMethod: GradingMethod;

  @Prop({ type: String, enum: StatusType, default: StatusType.ACTIVE })
  status: string;

  @Prop({ type: String, enum: QuestionStatus, default: QuestionStatus.PUBLISH })
  publicationState: string;

  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ type: Date })
  lastUsed: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastUsedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;
}

export const QuestionBankSchema = SchemaFactory.createForClass(QuestionBank);

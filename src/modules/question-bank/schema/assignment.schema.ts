import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class AssignmentQuestion {
  @Prop({ type: Boolean })
  oneOrMultipleAnswers: boolean;

  @Prop({ type: Boolean })
  shuffleChoices: boolean;

  @Prop([String])
  additionalFiles: string[];

  @Prop({ type: String })
  inputBoxSize: string;

  @Prop({ type: Number })
  maxNoOfUploadedFiles: number;

  @Prop({ type: String })
  maxSubmissionSize: string;

  @Prop({ type: Boolean })
  isMaxLimitEnabled: boolean;

  @Prop({ type: String })
  maxWords: string;

  @Prop({ type: Boolean })
  isMinLimitEnabled: boolean;

  @Prop({ type: String })
  minWords: string;


  @Prop([
    {
      grade: String,
      feedback: String,
    },
  ])
  answers: {
    grade: string;
    feedback?: string;
  }[];
}

export const AssignmentQuestionSchema =
  SchemaFactory.createForClass(AssignmentQuestion);

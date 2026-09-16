import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class TrueFalseQuestion {
  @Prop({ type: Boolean })
  oneOrMultipleAnswers: boolean;

  @Prop({ type: Boolean })
  shuffleChoices: boolean;

  @Prop({ type: Number })
  noOfChoices: number;

  @Prop([
    {
      grade: String,
      feedback: String,
      correctAnswer: Boolean,
    },
  ])
  answers: {
    grade: string;
    feedback?: string;
    correctAnswer?: boolean;
  }[];
}

export const TrueFalseQuestionSchema =
  SchemaFactory.createForClass(TrueFalseQuestion);

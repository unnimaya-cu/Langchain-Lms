import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class ShortAnswerQuestion {
  @Prop({ type: Boolean })
  oneOrMultipleAnswers: boolean;

  @Prop({ type: Boolean })
  shuffleChoices: boolean;

  @Prop({ type: String })
  inputBoxSize: string;

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

export const ShortAnswerQuestionSchema =
  SchemaFactory.createForClass(ShortAnswerQuestion);

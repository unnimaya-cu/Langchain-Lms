import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class FillBlankQuestion {
  @Prop({ type: Boolean })
  oneOrMultipleAnswers: boolean;

  @Prop({ type: Boolean })
  shuffleChoices: boolean;

  @Prop([
    {
      placeholders: [
        {
          placeholderIndex: { type: Number, required: true },
          choices: [{ type: String, required: true }],
          grade: String,
        },
      ],
      feedback: String,
    },
  ])
  answers: {
    placeholders: {
      placeholderIndex: number;
      choices: string[];
      grade: string;
    }[];
    feedback?: string;
  }[];
}

export const FillBlankQuestionSchema =
  SchemaFactory.createForClass(FillBlankQuestion);

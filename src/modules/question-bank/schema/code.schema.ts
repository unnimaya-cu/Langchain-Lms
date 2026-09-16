import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class CodeQuestion {
  @Prop({ type: Boolean, default: false })
  oneOrMultipleAnswers: boolean;

  @Prop({ type: Boolean, default: true })
  shuffleChoices: boolean;

  @Prop([
    {
      choice: String,
      grade: Number,
      feedback: String,
    },
  ])
  answers: {
    choice: string;
    grade: number;
    feedback?: string;
  }[];
}

export const CodeQuestionSchema = SchemaFactory.createForClass(CodeQuestion);

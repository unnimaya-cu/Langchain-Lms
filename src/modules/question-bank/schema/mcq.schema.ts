import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class McqQuestion {
  @Prop({ type: Boolean, default: false })
  oneOrMultipleAnswers: boolean;

  @Prop({ type: Boolean, default: false })
  shuffleChoices: boolean;

  @Prop({ type: Boolean, default: false })
  showHints: boolean;

  @Prop({ type: Number })
  noOfChoices: number;

  @Prop([
    {
      choice: String,
      grade: String,
      feedback: String,
      isAnswer: Boolean,
    },
  ])
  answers: {
    choice: string;
    grade: string;
    feedback?: string;
    isAnswer?: boolean;
  }[];

  @Prop([String])
  hints: string[];

  // @Prop({ type: Number, default: 0 })
  // penalty: number;
}

export const McqQuestionSchema = SchemaFactory.createForClass(McqQuestion);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema()
export class EssayQuestion {
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

  @Prop({ type: Boolean })
  allowAttachments: boolean;

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

export const EssayQuestionSchema = SchemaFactory.createForClass(EssayQuestion);

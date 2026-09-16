import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: true,
  })
  assessmentId: Types.ObjectId;

  //   @Prop({
  //     type: [
  //       {
  //         questionId: { type: String, required: true },
  //         selectedAnswer: { type: String, required: true },
  //       },
  //     ],
  //   })
  //   answers: {
  //     questionId: string;
  //     selectedAnswer: string;
  //   }[];

  @Prop({ type: Number, required: true })
  marks: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}
export const SubmissionSchema = SchemaFactory.createForClass(Submission);

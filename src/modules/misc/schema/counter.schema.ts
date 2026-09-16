import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ModelNames } from 'src/common/enum/model-names.enum';

@Schema()
export class Counter extends Document {
  @Prop({ required: true, unique: true, enum: ModelNames }) 
  modelName: string;

  @Prop({ required: true, default: 0 }) 
  sequence: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);

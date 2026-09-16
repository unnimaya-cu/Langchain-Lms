import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Counter } from './schema/counter.schema';
import { Model } from 'mongoose';
import { prefixes } from 'src/constants/prefixes';
import { ModelNames } from 'src/common/enum/model-names.enum';

@Injectable()
export class MiscService {
  constructor(@InjectModel(Counter.name) private readonly counterModel: Model<Counter>) {}

  async getNextSequence(
    modelName: ModelNames,
  ): Promise<string> {
    const {key,pad} = prefixes[modelName]

    const counter = await this.counterModel.findOneAndUpdate(
      { modelName: modelName },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true,  }, )
    const sequence = String(counter.sequence).padStart(pad, '0');
    return `${key}-${sequence}`;
  }
}

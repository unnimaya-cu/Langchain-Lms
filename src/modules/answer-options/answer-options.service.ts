import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnswerOption } from './schema/answer-option.schema';
import { Model } from 'mongoose';
import { AnswerOptionDto } from './dto/answer-option.dto';

@Injectable()
export class AnswerOptionsService {
  constructor(
    @InjectModel(AnswerOption.name)
    private readonly answerOptionModel: Model<AnswerOption>,
  ) {}

  async createAnswer(dto: AnswerOptionDto [] ) {
    try {
      console.log(' answeroptionss----', dto)

      const data = await  this.answerOptionModel.insertMany(dto)
      //  console.log("returndta",data)

      return { data:data,err:null }
    } catch (err) {
      console.log('err', err);
      return { data: null, err: err };
    }
  }
  async updateAnswerOption(id: string, updateDto: AnswerOptionDto) {
    try {
      const updateData = await this.answerOptionModel
        .findByIdAndUpdate(
          id,
          { $set: updateDto },
          { new: true, runValidators: true },
        )
        .exec();

      return { data: updateData, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async getAnswerOption(id: string) {
    try {
      const data = await this.answerOptionModel.findById(id).exec();
      return { data: data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err: err };
    }
  }
}

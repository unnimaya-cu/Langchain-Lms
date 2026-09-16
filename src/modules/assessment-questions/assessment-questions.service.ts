import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AssessmentQuestion } from './schema/assessment-question.schema';
import { ClientSession, Model, Types } from 'mongoose';
import { AssessmentQuestionDto } from './dto/assessment-question.dto';
import { AnswerOptionDto } from '../answer-options/dto/answer-option.dto';

@Injectable()
export class AssessmentQuestionsService {
  constructor(
    @InjectModel(AssessmentQuestion.name)
    private readonly assessmentQuestionModel: Model<AssessmentQuestion>,
  ) {}
  async createAssessmentQuestion(dto: AssessmentQuestionDto[],
    // session?:ClientSession 
  ) {
    try {
      // console.log('dataa', dto);
      const data = this.assessmentQuestionModel.insertMany(dto);
      return { data: data, err: null };
    } catch (err) {
      console.log('err', err);
      return { data: null, err: err };
    }
  }

  async updateQuestionOptions(questionId: string, options: AnswerOptionDto[]) {
    const updateOptions = this.assessmentQuestionModel.findByIdAndUpdate(
      questionId,
      { options },
      { new: true },
    );
    return updateOptions;
  }

  async updateAssessmentQuestion(id: string, updateDto: AssessmentQuestionDto) {
    try {
      const updateData = await this.assessmentQuestionModel
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

  async getAssessmentQuestion(id: string) {
    try {
      const objectId = new Types.ObjectId(id);
      const data = await this.assessmentQuestionModel.findById(id).exec();
      // const data = await this.assessmentQuestionModel.aggregate().lookup({
      //   from: 'assessmentquestions',
      //   foreignField: '_id',
      //   localField: 'assessmentId',
      //   as: 'assessmentdetails',
      // }).match({})
      return { data: data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err: err };
    }
  }


  async upsertQuestions(questions: AssessmentQuestionDto[], userId: string,  assessmentId: Types.ObjectId) {
    const questionsDto:AssessmentQuestionDto[] = []
    if(questions?.length){for(const question of questions) {
      const questionId = question.questionId
      if(questionId){
        await this.assessmentQuestionModel.findByIdAndUpdate(   questionId,
          { $set: {...question } },
          { new: true, runValidators: true },
        )
        .exec();
      }
      else {
questionsDto.push({
        ...question,
        options: question?.options,
        createdAt: new Date(),
        createdBy: userId,
        assessmentId,
      })
      }
    }}
    
    if (questionsDto.length > 0) {
      await this.assessmentQuestionModel.insertMany(questionsDto);
    }
  }
    async deleteQuestions(ids:Types.ObjectId[]){
    const deletedCount = await this.assessmentQuestionModel.deleteMany({_id:{$in:ids}})
    return deletedCount
  }
}

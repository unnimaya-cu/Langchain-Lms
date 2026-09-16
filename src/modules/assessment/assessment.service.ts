import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Assessment } from './schema/assessment.schema';
import { AssessmentDto } from './dto/assessment.dto';
import { AssessmentQuestionsService } from '../assessment-questions/assessment-questions.service';
import { StatusType } from 'src/common/enum/status-type.enum';
import { AssessmentQuestion } from '../assessment-questions/schema/assessment-question.schema';

@Injectable()
export class AssessmentService {
  constructor(
    @InjectModel(Assessment.name)
    private readonly assessmentModel: Model<Assessment>,
    private assessmentQuestionService: AssessmentQuestionsService,
    @InjectModel(AssessmentQuestion.name)
    private readonly assessmentQuestionModel: Model<AssessmentQuestion>,
  ) {}

  async createAssessment(
    dto: AssessmentDto,
    userId: string,
    // session?: ClientSession,
  ) {
    const { title, questions } = dto;
    
    // ✅ Check if assessment with the same title already exists
    const existingAssessment = await this.assessmentModel.findOne({ title, status:{$ne:StatusType.DELETED} }).exec();
    // if (existingAssessment) {
    //   throw new BadRequestException(
    //     'This Assessment Title already exists. Please use a different title.',
    //   );
    // }

    const assessmentData = await new this.assessmentModel({
      ...dto,
      createdAt: new Date(),
      createdBy: userId,
    }).save();

    const questionsDto = questions?.map((question) => {
      return {
        ...question,
        assessmentId: assessmentData?._id,
        options: question?.options,
        createdAt: new Date(),
        createdBy: userId,
      };
    });

    await this.assessmentQuestionService.createAssessmentQuestion(
      questionsDto,
      // session,
    );
    return assessmentData;
  }

  async updateAssessment(
    id: Types.ObjectId,
    updateDto: AssessmentDto,
    userId: string,
  ) {
    try {
      const { questions, deletedQuestions } = updateDto;
      const questionIds = questions
        .map((question) => question?.questionId)
        .filter((id) => id !== undefined)
        .map((id) => new Types.ObjectId(id));

      // console.log('questionIds', questionIds);

      const existingQuestions = await this.assessmentQuestionModel.find({
        assessmentId: id,
      }).select('_id');

      const existingQuestionIds = existingQuestions.map(
        (question) => question._id.toString()
      );

      const questionsToDelete = existingQuestionIds.filter(
        (existingId) =>
          !questionIds.some(
            (incomingId) => incomingId.toString() === existingId
          )
      );

      // console.log('questionsToDelete', questionsToDelete);

      const updateData = await this.assessmentModel
        .findByIdAndUpdate(
          id,
          { $set: { ...updateDto } },
          { new: true, runValidators: true },
        )
        .exec();

      if (questionsToDelete.length > 0) {
        await this.assessmentQuestionService.deleteQuestions(
          questionsToDelete.map((id) => new Types.ObjectId(id))
        );
      }
      await this.assessmentQuestionService.deleteQuestions(deletedQuestions);
      await this.assessmentQuestionService.upsertQuestions(questions, userId,id);

      return { data: updateData, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async getAssessment(id: Types.ObjectId) {
    // try {
    const objectId = new Types.ObjectId(id);
    // const data = await this.assessmentModel.findById(id).exec();
    const data = await this.assessmentModel
      .aggregate([
        {
          $match: { _id: objectId }, 
        },
        {
          $lookup: {
            from: 'assessmentquestions', 
            localField: '_id', 
            foreignField: 'assessmentId', 
            as: 'assessmentquestiondetails', 
          },
        },
      ])
      .exec();

    return data.length >0 ? data[0]:null
    // } catch (err) {
    //   console.log(err);
    //   return { data: null, err: err };
    // }
  }
}

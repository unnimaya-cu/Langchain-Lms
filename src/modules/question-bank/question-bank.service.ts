import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuestionBankDto } from './dto/questionbank.dto';
import { QuestionBank } from './schema/questionbank.schema';
import { QuestionType } from 'src/common/enum/question-type.enum';
import { MiscService } from '../misc/misc.service';
import { ModelNames } from 'src/common/enum/model-names.enum';
import { UpdateQuestionBankDto } from './dto/update-question.dto';
import { StatusType } from 'src/common/enum/status-type.enum';
import { QuestionStatus } from 'src/common/enum/question-status.enum';
import { PipelineStage } from 'mongoose';
import { convert } from 'html-to-text';

@Injectable()
export class QuestionBankService {
  constructor(
    @InjectModel(QuestionBank.name)
    private readonly questionModel: Model<QuestionBank>,
    private readonly miscService: MiscService,
  ) {}

  // CREATE
  async create(
    dto: QuestionBankDto,
    userId: string,
  ): Promise<{ data: QuestionBank | null; err: any }> {
    try {
      const {
        questionType,
        mcq,
        trueFalse,
        fillBlank,
        essay,
        // code,
        // fileUpload,
        assignment,
        shortAnswer,
        ...base
      } = dto;

      if(dto?.idNumber) {
        const existingId = await this.questionModel.findOne({idNumber: dto.idNumber})

        if(existingId) {
          return {data:null, err:'Id already exists.'}
        }
      }

      const plainQuestionText = convert(dto.questionText, {
        wordwrap: false,
      }).trim();

      const existingQuestions = await this.questionModel.find({
        courseId: new Types.ObjectId(dto.courseId),
        categoryId: new Types.ObjectId(dto.categoryId),
      });

      const duplicate = existingQuestions.find((q) => {
        const existingPlainText = convert(q.questionText, {
          wordwrap: false,
        }).trim();

        return existingPlainText === plainQuestionText;
      });

      if (duplicate) {
        throw new BadRequestException(
          'Same description already exists.',
        );
      }

      let questionTypeData = {};

      if (questionType === QuestionType.MCQ) {
        questionTypeData = mcq;
      }

      if (questionType === QuestionType.TRUE_FALSE) {
        questionTypeData = trueFalse;
      }

      if (questionType === QuestionType.FILL_BLANK) {
        questionTypeData = fillBlank;
      }

      if (questionType === QuestionType.ESSAY) {
        questionTypeData = essay;
      }

      // if (questionType === QuestionType.CODE) {
      //   questionTypeData = code;
      // }

      // if (questionType === QuestionType.FILE_UPLOAD) {
      //   questionTypeData = fileUpload;
      // }

      if (questionType === QuestionType.ASSIGNMENT) {
        questionTypeData = assignment;
      }

      if (questionType === QuestionType.SHORT_ANSWER) {
        questionTypeData = shortAnswer;
      }

      const questionCode = await this.miscService.getNextSequence(
        ModelNames.QUESTION,
      );

      const question = new this.questionModel({
        ...base,
        categoryId: new Types.ObjectId(base.categoryId),
        // courseId: new Types.ObjectId(base.courseId),
        ...(base.courseId && {
          courseId: new Types.ObjectId(base.courseId),
        }),
        questionType,
        questionCode,
        ...questionTypeData,
        source: base?.source ?? 'question-bank',
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
      });
      const data = await question.save();
      return { data, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  // FIND ALL
  async findAll(filters?: {
    startIndex?: number;
    noOfItems?: number;
    difficulty?: string;
    categoryId?: string;
    courseId?: string;
    search?: string;
    questions?: string;
  }): Promise<{ data: QuestionBank[]; err: any }> {
    try {
      // const query = this.questionModel.find();

      // if (filters?.difficulty) query.where('difficulty').equals(filters.difficulty);
      // if (filters?.questionType) query.where('questionType').equals(filters.questionType);
      // if (filters?.search)
      //   query.where('questionText', new RegExp(filters.search, 'i'));

      // const data = await query
      //   .populate('createdBy', 'name email')
      //   .populate('updatedBy', 'name email')
      //   .exec();

      // return { data, err: null };

      const searchQuery: any[] = [
        {
          $lookup: {
            from: 'users',
            localField: 'lastUsedBy',
            foreignField: '_id',
            as: 'lastUsedDetails',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdByDetails',
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryDetails',
          },
        },
        {
          $unwind: {
            path: '$categoryDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        {
          $unwind: { path: '$courseDetails', preserveNullAndEmptyArrays: true },
        },
      ];

      const questions = filters?.questions || 'all';

      if (filters?.difficulty) {
        searchQuery.push({
          $match: {
            difficulty: { $regex: filters.difficulty, $options: 'i' },
          },
        });
      }

      if (filters?.categoryId) {
        searchQuery.push({
          $match: {
            categoryId: new Types.ObjectId(filters.categoryId),
          },
        });
      }

      if (filters?.courseId) {
        searchQuery.push({
          $match: {
            courseId: new Types.ObjectId(filters.courseId),
          },
        });
      }

      if (filters?.search) {
        searchQuery.push({
          $match: {
            questionText: {
              $regex: filters.search,
              $options: 'i',
            },
          },
        });
      }

      if (questions?.toLowerCase() !== 'all') {
        searchQuery.push({
          $match: {
            questionType: {
              $regex: questions,
              $options: 'i',
            },
          },
        });
      }

      const totalQuestionsResult = await this.questionModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalQuestions = totalQuestionsResult[0]?.total || 0;

      const data = await this.questionModel.aggregate([
        ...searchQuery,
        { $sort: { createdAt: -1 } },
        { $skip: filters?.startIndex || 0 },
        { $limit: filters?.noOfItems || 10 },
        {
          $project: {
            questionName: 1,
            questionText: 1,
            questionType: 1,
            difficulty: 1,
            questionCode: 1,
            createdAt: 1,
            id: {
              $ifNull:['$id', null]
            },
            status: {
              $ifNull: ['$status', null],
            },
            publicationState: {
              $ifNull: ['$publicationState', null],
            },
            version: 1,
            lastUsedAt: {
              $ifNull: ['$lastUsed', null],
            },
            lastUsedBy: {
              $let: {
                vars: {
                  user: { $arrayElemAt: ['$lastUsedDetails', 0] }
                },
                in: {
                  $cond: [
                    { $ifNull: ['$$user', false] },
                    { $concat: [{ $ifNull: ['$$user.firstName', ''] }, ' ', { $ifNull: ['$$user.lastName', ''] }] },
                    null
                  ]
                }
              }
            },
            createdBy: {
              $cond: {
                if: { $gt: [{ $size: '$createdByDetails' }, 0] },
                then: {
                  $trim: {
                    input: {
                      $concat: [
                        {
                          $ifNull: [
                            {
                              $arrayElemAt: ['$createdByDetails.firstName', 0],
                            },
                            '',
                          ],
                        },
                        ' ',
                        {
                          $ifNull: [
                            { $arrayElemAt: ['$createdByDetails.lastName', 0] },
                            '',
                          ],
                        },
                      ],
                    },
                  },
                },
                else: null,
              },
            },
          },
        },
      ]);

      return { data: {
        data, 
        totalQuestions,
        totalPages:Math.ceil(totalQuestions/(filters?.noOfItems || 10)),
        currentPage: Math.ceil((filters?.startIndex || 0)/(filters?.noOfItems || 10)) + 1
      } as any, err: null };
    } catch (err) {
      return { data: [], err };
    }
  }

  // FIND ONE
  async findOne(id: string): Promise<{ data: QuestionBank | null; err: any }> {
    try {
      const data = await this.questionModel
        .findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('categoryId', 'name')
        .populate('courseId', 'title')
        .exec();

      if (!data) throw new Error('Question not found');
      return { data, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  // UPDATE
  async update(
    id: string,
    dto: UpdateQuestionBankDto,
    userId: string,
  ): Promise<{ data: QuestionBank | null; err: any }> {
    try {

      const {mcq, trueFalse, fillBlank, essay, assignment, shortAnswer, ...base} = dto;

      let payload = base
      // const question = await this.questionModel.findById(id);

      // if (!question) throw new Error('Question not found');

      const questionDoc = await this.questionModel.findById(id);
      if (!questionDoc) throw new Error('Question not found');

      const normalizeQuestionText = (html: string) =>
      convert(html || '', {
        wordwrap: false,
      })
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      if (dto.questionText) {
        const existingNormalized = normalizeQuestionText(
          questionDoc.questionText,
        );

        const incomingNormalized = normalizeQuestionText(
          dto.questionText,
        );

        if (existingNormalized !== incomingNormalized) {
          const questionsInCourseCategory = await this.questionModel.find({
            _id: { $ne: id },
            courseId: questionDoc.courseId,
            categoryId: questionDoc.categoryId,
          });

          const duplicate = questionsInCourseCategory.find((q) => {
            return (
              normalizeQuestionText(q.questionText) === incomingNormalized
            );
          });

          if (duplicate) {
            throw new BadRequestException(
              'Same description already exists.',
            );
          }
        }
      }

      if(dto?.idNumber) {
        const existingId = await this.questionModel.findOne({idNumber: dto.idNumber, _id:{$ne:id}})

        if(existingId) {
          return {data:null, err:'Id already exists.'}
        }
      }

      const question = questionDoc.toObject();

      if(question.questionType === QuestionType.MCQ) {
        payload = {
          ...base,
          ...mcq
        }
      }
      else if(question.questionType === QuestionType.TRUE_FALSE) {
        payload = {
          ...base,
          ...trueFalse
        }
      }
      else if(question.questionType === QuestionType.FILL_BLANK) {
        payload = {
          ...base,
          ...fillBlank
        }
      }
      else if(question.questionType === QuestionType.ESSAY) {
        payload = {
          ...base,
          ...essay
        }
      }
      else if(question.questionType === QuestionType.ASSIGNMENT) {
        payload = {
          ...base,
          ...assignment
        }
      }
      else if(question.questionType === QuestionType.SHORT_ANSWER) {
        payload = {
          ...base,
          ...shortAnswer
        }
      } 

      const normalize = (val: any): any => {
        if (val === undefined || val === null) return null;

        if (val instanceof Types.ObjectId) return val.toString();

        // Array
        if (Array.isArray(val)) {
          return val.map((v) => normalize(v));
        }

        if (typeof val === 'object') {
          const obj: any = {};

          Object.keys(val).forEach((k) => {
            if (
              ['_id', '__v', 'version', 'createdBy', 'updatedBy'].includes(k)
            )
              return;

            obj[k] = normalize(val[k]);
          });

          return obj;
        }

        if (typeof val === 'string') {
          return val.replace(/\s+/g, '').trim();
        }

        return val;
    };

    const existingSubset = Object.keys(payload).reduce((acc, key) => {
      acc[key] = question[key];
      return acc;
    }, {} as any);

    const comparableExisting = normalize(existingSubset);
    const comparablePayload = normalize(payload);

    const isSame =
      JSON.stringify(comparableExisting) ===
      JSON.stringify(comparablePayload);

    // console.log('isSame', isSame);

    if (isSame) {
      const data = await this.questionModel
        .findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      return { data, err: null };
    }

      await this.questionModel.updateOne(
        { _id: id },
        {
          $set: {
            ...payload,
            updatedBy: new Types.ObjectId(userId),
            categoryId: new Types.ObjectId(question.categoryId),
            courseId: new Types.ObjectId(question.courseId),
          },
          $inc: { version: 1 },
        },
        {
          strict: false,
        },
      );

      const data = await this.questionModel
        .findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');

      if (!data) throw new Error('Question not found');
      return { data, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  // DELETE
  async remove(id: string): Promise<{ data: QuestionBank | null; err: any }> {
    try {
      const result = await this.questionModel.findById(id);
      if (!result) throw new Error('Question not found');

      result.status = StatusType.DELETED;
      const deletedQuestion = await result.save();

      return { data: deletedQuestion, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  async getId() {
    try {
      const id = await this.miscService.getNextSequence(ModelNames.QUESTION);
      return { data: id, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  async statusChange(id: string) {
    try {
      const question = await this.questionModel.findById(id).exec();
      const newStatus =
        question.publicationState === QuestionStatus.PUBLISH
          ? QuestionStatus.HIDDEN
          : QuestionStatus.PUBLISH;
      const statusChange = await this.questionModel
        .findByIdAndUpdate(id, { publicationState: newStatus }, { new: true })
        .exec();

      return { data: statusChange, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async getAllQuestionsByCategoryAndCourse(filters?: {
    startIndex?: number;
    noOfItems?: number;
    categoryId?: string;
    courseId?: string;
  }): Promise<{ data: QuestionBank[]; err: any }> {
    try {
      const searchQuery: any[] = [
        {
          $match:{status:StatusType.ACTIVE}
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryDetails',
          },
        },
        {
          $unwind: {
            path: '$categoryDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        {
          $unwind: { path: '$courseDetails', preserveNullAndEmptyArrays: true },
        },
      ];

      if (filters?.categoryId) {
        searchQuery.push({
          $match: {
            categoryId: new Types.ObjectId(filters.categoryId),
          },
        });
      }

      if (filters?.courseId) {
        searchQuery.push({
          $match: {
            courseId: new Types.ObjectId(filters.courseId),
          },
        });
      }

      const data = await this.questionModel.aggregate([
        ...searchQuery,
        { $sort: { createdAt: -1 } },
        { $skip: filters?.startIndex || 0 },
        { $limit: filters?.noOfItems || 10 },
        {
          $project: {
            categoryDetails: 0,
            courseDetails: 0,
            updatedAt: 0,
            createdAt: 0,
            __v: 0,
          },
        },
      ]);

      return { data: data, err: null };
    } catch (err) {
      return { data: [], err };
    }
  }

  async getQuestionTypeMetrics() {
    try {
      const query: PipelineStage[] = [
        {
          $group: {
            _id: {
              courseId: '$courseId',
              questionType: '$questionType',
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.courseId',
            questionTypes: {
              $push: {
                k: '$_id.questionType',
                v: '$count',
              },
            },
          },
        },
        {
          $addFields: {
            questionTypes: {
              $arrayToObject: {
                $sortArray: {
                  input: '$questionTypes',
                  sortBy: { k: 1 },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        { $unwind: '$courseDetails' },
        {
          $addFields: {
            course: '$courseDetails.title',
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: [{ course: '$course' }, '$questionTypes'],
            },
          },
        },
        {
          $sort: {
            course: 1,
          },
        },
      ];

      const metrics = await this.questionModel.aggregate(query);

      return { data: metrics, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  async getMcqQuestions(categoryId: string, courseId: string, search: string) {
    try{
      const searchQuery: any = {
        questionType: QuestionType.MCQ,
        status: StatusType.ACTIVE,
      }

      if(categoryId) {
        searchQuery.categoryId = new Types.ObjectId(categoryId);
      }

      if(courseId) {
        searchQuery.courseId = new Types.ObjectId(courseId);
      }

      if (search) {
        searchQuery.questionText = {
          $regex: search.trim(),
          $options: 'i',
        };
      }

      const questions = await this.questionModel.find(searchQuery)
      .select('_id questionText answers').lean();

      const data = questions.map((question: any) => ({
        questionTitle: question.questionText,
        questionId: question._id.toString(),
        options: question.answers.map((answer: any) => ({
          optionName: answer.choice,
          correctAnswer: answer.isAnswer,
        })),
      }));

      return { data, err: null };
    }catch(err) {
      console.error(err)
      return {data:[], err:null}
    }
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CourseAssessment } from './schema/course-assessment.schema';
import mongoose, { Model, Types } from 'mongoose';
import { CreateCourseAssessmentDto } from './dto/course-assessment.dto';
import { UpdateCourseAssessmentDto } from './dto/update-course-assessment.dto';
import { StatusType } from 'src/common/enum/status-type.enum';
import { QuestionBank } from '../question-bank/schema/questionbank.schema';
import { QuestionBankService } from '../question-bank/question-bank.service';
import { UpdateInstructionsDto } from './dto/update-instructions.dto';
import { User } from '../user/schema/user.schema';
import { QuestionType } from 'src/common/enum/question-type.enum';
import { StudentAssessment } from '../student-assessment/schema/create-student-assessment.schema';
import { convert } from 'html-to-text';
import { Chapter } from '../chapter/schema/chapter.schema';
import { CourseModule } from '../coursemodule/schema/coursemodule.schema';


@Injectable()
export class CourseAssessmentService {
  constructor(
    @InjectModel(CourseAssessment.name)
    private courseassessmentModel: Model<CourseAssessment>,

    @InjectModel(QuestionBank.name)
    private questionBankModel: Model<QuestionBank>,

    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly questionBankService: QuestionBankService,
    @InjectModel(StudentAssessment.name)
    private studentAssessmentModel: Model<StudentAssessment>,
    @InjectModel(Chapter.name)
    private chapterModel: Model<Chapter>,
    @InjectModel(CourseModule.name)
    private courseModule: Model<CourseModule>,
  ) {}

  async createAssessment(
    dto: CreateCourseAssessmentDto,
    userId: Types.ObjectId,
  ) {
    try {
      // if (dto.startTime && dto.endTime && dto.startTime > dto.endTime) {
      //   throw new BadRequestException('Start time must be before end time');
      // }

      if(!dto.questions || dto.questions.length === 0) {
        throw new BadRequestException('Questions are required');
      }

      const existingAssessment = await this.courseassessmentModel.find({
        title: dto.title,
        courseId: dto.courseId,
        categoryId: dto.categoryId,
        status: { $ne: StatusType.DELETED },
      });

      if (existingAssessment && existingAssessment.length > 0) {
        return {
          data: null,
          err: {
            custom: true,
            message: 'Already exists.',
            fields: ['title'],
            code: 409,
            name: 'ValidationError',
          },
        };
      }

      const seenQuestions = new Set<string>();

      for (const question of dto.questions) {
        const normalizedText = convert(question.questionText || '', {
          wordwrap: false,
        })
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (seenQuestions.has(normalizedText)) {
          return {
            data: null,
            err: 'Same description not allowed.',
          };
        }

        seenQuestions.add(normalizedText);
      }

      let processedQuestions: any[] = [];

      if (dto.assessmentType === 'quiz' && dto?.questions?.length) {
        for (const q of dto.questions) {
          if (q.source === 'assessment') {

            const qbPayload: any = q;

            qbPayload.createdBy = new Types.ObjectId(userId);
            qbPayload.updatedBy = new Types.ObjectId(userId);
            qbPayload.source = 'assessment';

            const normalizedText = convert(q.questionText || '', {
                wordwrap: false,
              })
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

              const existingQuestions = await this.questionBankModel.find({
                courseId: new Types.ObjectId(q.courseId),
                categoryId: new Types.ObjectId(q.categoryId),
              });

              const duplicate = existingQuestions.some((question) => {
                const existingText = convert(question.questionText || '', {
                  wordwrap: false,
                })
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toLowerCase();

                return existingText === normalizedText;
              });

              // if (duplicate) {
              //   return {
              //     data: null,
              //     err: `A question with the same description already exists in this course and category. (Question: ${q.questionName})`
              //   };
              // }

            await this.questionBankService.create(qbPayload, userId.toString());

            const flattenedQuestion: any = {
              _id: new Types.ObjectId(),
              ...q,
            };

            flattenedQuestion.categoryId = new Types.ObjectId(q.categoryId);
            flattenedQuestion.courseId = new Types.ObjectId(q.courseId);

            if (q.questionType === 'mcq' && q.mcq) {
              Object.assign(flattenedQuestion, q.mcq);
              delete flattenedQuestion.mcq;
            }

            if (q.questionType === 'true_false' && q.trueFalse) {
              Object.assign(flattenedQuestion, q.trueFalse);
              delete flattenedQuestion.trueFalse;
            }

            if (q.questionType === 'fill_blank' && q.fillBlank) {
              Object.assign(flattenedQuestion, q.fillBlank);
              delete flattenedQuestion.fillBlank;
            }

            if (q.questionType === 'essay' && q.essay) {
              Object.assign(flattenedQuestion, q.essay);
              delete flattenedQuestion.essay;
            }

            if (q.questionType === 'short_answer' && q.shortAnswer) {
              Object.assign(flattenedQuestion, q.shortAnswer);
              delete flattenedQuestion.shortAnswer;
            }

            if (q.questionType === 'assignment' && q.assignment) {
              Object.assign(flattenedQuestion, q.assignment);
              delete flattenedQuestion.assignment;
            }

            processedQuestions.push(flattenedQuestion);
          } else if (q.source === 'question-bank') {
            const flattenedQuestion: any = {
              _id: new Types.ObjectId(),
              ...q,
            };

            flattenedQuestion.categoryId = new Types.ObjectId(q.categoryId);
            flattenedQuestion.courseId = new Types.ObjectId(q.courseId);

            if (q.questionType === 'mcq' && q.mcq) {
              Object.assign(flattenedQuestion, q.mcq);
              delete flattenedQuestion.mcq;
            }

            if (q.questionType === 'true_false' && q.trueFalse) {
              Object.assign(flattenedQuestion, q.trueFalse);
              delete flattenedQuestion.trueFalse;
            }

            if (q.questionType === 'fill_blank' && q.fillBlank) {
              Object.assign(flattenedQuestion, q.fillBlank);
              delete flattenedQuestion.fillBlank;
            }

            if (q.questionType === 'essay' && q.essay) {
              Object.assign(flattenedQuestion, q.essay);
              delete flattenedQuestion.essay;
            }

            if (q.questionType === 'short_answer' && q.shortAnswer) {
              Object.assign(flattenedQuestion, q.shortAnswer);
              delete flattenedQuestion.shortAnswer;
            }

            if (q.questionType === 'assignment' && q.assignment) {
              Object.assign(flattenedQuestion, q.assignment);
              delete flattenedQuestion.assignment;
            }
            processedQuestions.push({
              ...flattenedQuestion,
              _id: new Types.ObjectId(q._id),
              categoryId: new Types.ObjectId(q.categoryId),
              courseId: new Types.ObjectId(q.courseId),
              createdBy: new Types.ObjectId(q.createdBy),
              updatedBy: new Types.ObjectId(q.updatedBy),
            });
          }
        }
      }

      if (
        dto.assessmentType === 'assignment' ||
        dto.assessmentType === 'project' ||
        dto.assessmentType === 'peer_review'
      ) {
        processedQuestions = dto.questions.map((q) => ({
          ...q,
          _id: new Types.ObjectId(),
        }));
      }

      const assessment = await this.courseassessmentModel.create({
        ...dto,
        questions: processedQuestions,
        createdBy: userId,
        updatedBy: userId,
      });

      const questionBankIds = dto.questions
        ?.filter((q) => q._id)
        .map((q) => new Types.ObjectId(q._id));

      if (questionBankIds.length) {
        await this.questionBankModel.updateMany(
          { _id: { $in: questionBankIds } },
          { $set: { 
            lastUsed: new Date(),
            lastUsedBy: new Types.ObjectId(userId)
          } },
        );
      }
      return { data: assessment, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getCourseAssessment(tutorId?: string, type?:string, courseId?: string) {
    try {
      if(tutorId) {
        const tutor = await this.userModel.findById(tutorId);
        
        if(!tutor) {
          return { data: null, err: 'Tutor not found.' }
        }
      }

      const filter:any = {
        status:{$ne:StatusType.DELETED}
      }

      if(tutorId) {
        filter.createdBy = tutorId
      }

      if(type) {
        filter.assessmentType = type
      }

      // const data = await this.courseassessmentModel.find(
      //   tutorId ? 
      //   { createdBy: tutorId, status:{$ne:StatusType.DELETED} } 
      //   : {status:{$ne:StatusType.DELETED}}
      // );

      let data = await this.courseassessmentModel.find(filter);

      if (courseId) {

        const modules = await this.courseModule.find({
          courseId: courseId,
          status: StatusType.ACTIVE
        }).select('_id');

        const moduleIds = modules.map(
          (module) => module._id
        );

        const addedChapters = await this.chapterModel.find({
          moduleId: { $in: moduleIds },
          chapterType: 'COURSE_ASSESSMENT',
          status: StatusType.ACTIVE
        }).select('courseAssessmentId');

        const addedAssessmentIds = addedChapters
          .map(
            (chapter) =>
              chapter.courseAssessmentId?.toString()
          )
          .filter(Boolean);

        data = data.filter(
          (assessment) =>
            !addedAssessmentIds.includes(
              assessment._id.toString()
            )
        );
      }
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getCourseAssessmentById(id: string) {
    try {
      const data = await this.courseassessmentModel.findById(id)
      .populate({
        path:'categoryId',
        select:'_id name'
      })
      .populate({
        path:'courseId',
        select:"_id title"
      })
      .lean()

      const course: any = data?.courseId;
      const category: any = data?.categoryId;

      const assignments = await this.studentAssessmentModel.find({assessmentId: id}).lean();  

      const studentIds = [
        ...new Set(
          assignments
            .filter(a => a.studentId)
            .map(a => a.studentId.toString())
        )
      ];

      // const groupIds = [
      //   ...new Set(
      //     assignments
      //       .filter(a => a.groupId)
      //       .map(a => a.groupId.toString())
      //   )
      // ];

      const response = {
        ...data,
        courseId: course?._id,
        courseName: course?.title,
        categoryId: category?._id,
        categoryName: category?.name,
        studentIds,
        groupIds: data?.groupIds || []
      };

      return { data: response, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async updateCourseAssessment(
    assessmentId: string,
    dto: UpdateCourseAssessmentDto,
    userId: Types.ObjectId,
  ) {
    try {
      // Time validation (only if both provided)
      // if (dto.startTime && dto.endTime && dto.startTime > dto.endTime) {
      //   throw new BadRequestException('Start time must be before end time');
      // }
      if(!dto.questions || dto.questions.length === 0) {
        throw new BadRequestException('Questions are required');
      }

      const assessment = await this.courseassessmentModel.findById(assessmentId)

      if(!assessment) {
        return {data: null, err: 'Assessment not found.'}
      }

      const seenQuestions = new Set<string>();

      for (const question of dto.questions) {
        const normalizedText = convert(question.questionText || '', {
          wordwrap: false,
        })
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (seenQuestions.has(normalizedText)) {
          return {
            data: null,
            err: 'Same description not allowed.',
          };
        }

        seenQuestions.add(normalizedText);
      }

      let processedQuestions: any[] = [];

      if(assessment.assessmentType === 'quiz' && dto?.questions?.length) {        for(const q of dto.questions) {
          if (q._id) {
            const {mcq, trueFalse, fillBlank, essay, assignment, shortAnswer, ...base} = q;
            let payload = base
            
            if(q.questionType === QuestionType.MCQ) {
              payload = {
                ...base,
                ...mcq
                }
            }
            else if(q.questionType === QuestionType.TRUE_FALSE) {
              payload = {
                ...base,
                ...trueFalse
              }
            }
            else if(q.questionType === QuestionType.FILL_BLANK) {
              payload = {
                ...base,
                ...fillBlank
              }
            }
            else if(q.questionType === QuestionType.ESSAY) {
              payload = {
                ...base,
                ...essay
              }
            }
            else if(q.questionType === QuestionType.ASSIGNMENT) {
              payload = {
                ...base,
                ...assignment
              }
            }
            else if(q.questionType === QuestionType.SHORT_ANSWER) {
              payload = {
                ...base,
                ...shortAnswer
              }
            } 

            processedQuestions.push({
              ...payload,
              _id: new Types.ObjectId(q._id),
              categoryId: new Types.ObjectId(q.categoryId),
              courseId: new Types.ObjectId(q.courseId),
              createdBy: new Types.ObjectId(q.createdBy),
              updatedBy: new Types.ObjectId(q.updatedBy), 
            });
            continue;
          }

          if(!q._id) {
            if (q.source === 'assessment') {

              const qbPayload: any = q;

              qbPayload.createdBy = new Types.ObjectId(userId);
              qbPayload.updatedBy = new Types.ObjectId(userId);
              qbPayload.source = 'assessment';

              const normalizedText = convert(q.questionText || '', {
                wordwrap: false,
              })
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

              const existingQuestions = await this.questionBankModel.find({
                courseId: new Types.ObjectId(q.courseId),
                categoryId: new Types.ObjectId(q.categoryId),
              });

              const duplicate = existingQuestions.some((question) => {
                const existingText = convert(question.questionText || '', {
                  wordwrap: false,
                })
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toLowerCase();

                return existingText === normalizedText;
              });

              // if (duplicate) {
              //   return {
              //     data: null,
              //     err: `A question with the same description already exists in this course and category. (Question: ${q.questionName})`
              //   };
              // }

              await this.questionBankService.create(qbPayload, userId.toString());

              const flattenedQuestion: any = {
                _id: new Types.ObjectId(),
                ...q,
              };

              flattenedQuestion.categoryId = new Types.ObjectId(q.categoryId);
              flattenedQuestion.courseId = new Types.ObjectId(q.courseId);

              if (q.questionType === 'mcq' && q.mcq) {
                Object.assign(flattenedQuestion, q.mcq);
                delete flattenedQuestion.mcq;
              }

              if (q.questionType === 'true_false' && q.trueFalse) {
                Object.assign(flattenedQuestion, q.trueFalse);
                delete flattenedQuestion.trueFalse;
              }

              if (q.questionType === 'fill_blank' && q.fillBlank) {
                Object.assign(flattenedQuestion, q.fillBlank);
                delete flattenedQuestion.fillBlank;
              }

              if (q.questionType === 'essay' && q.essay) {
                Object.assign(flattenedQuestion, q.essay);
                delete flattenedQuestion.essay;
              }

              if (q.questionType === 'short_answer' && q.shortAnswer) {
                Object.assign(flattenedQuestion, q.shortAnswer);
                delete flattenedQuestion.shortAnswer;
              }

              if (q.questionType === 'assignment' && q.assignment) {
                Object.assign(flattenedQuestion, q.assignment);
                delete flattenedQuestion.assignment;
              }

              processedQuestions.push(flattenedQuestion);
            } else if (q.source === 'question-bank') {
              processedQuestions.push({
                ...q,
                _id: new Types.ObjectId(q._id),
                categoryId: new Types.ObjectId(q.categoryId),
                courseId: new Types.ObjectId(q.courseId),
                createdBy: new Types.ObjectId(q.createdBy),
                updatedBy: new Types.ObjectId(q.updatedBy),
              });
            }
          }
        }
      }

      if (
      dto.assessmentType === 'assignment' ||
      dto.assessmentType === 'project' ||
      dto.assessmentType === 'peer_review'
      ) {
        // processedQuestions = dto.questions || [];
        processedQuestions = (dto.questions || []).map((question) => ({
          ...question,
          _id: question._id
            ? new Types.ObjectId(question._id)
            : new Types.ObjectId(),
        }));
      }

      assessment.title = dto.title ?? assessment.title;
      (assessment as any).questions = processedQuestions;
      assessment.updatedBy = userId;

      await assessment.save();

      const candidateIds = dto.questions
        ?.filter((q) => q?._id)
        .map((q) => new Types.ObjectId(q._id)) || [];

      const existingQBQuestions = await this.questionBankModel.find(
        { _id: { $in: candidateIds } },
        { _id: 1 }
      );

      const questionBankIds = existingQBQuestions.map(q =>
        new Types.ObjectId(q._id)
      );

      // const questionBankIds = dto.questions
      //   ?.filter((q) => q?.source === 'question-bank' && q._id)
      //   .map((q) => new Types.ObjectId(q._id));

      if (questionBankIds.length) {
        await this.questionBankModel.updateMany(
          { _id: { $in: questionBankIds } },
          { $set: { 
            lastUsed: new Date(),
            lastUsedBy: new Types.ObjectId(userId)
          } },
        );
      }

      // const updatedAssessment =
      //   await this.courseassessmentModel.findOneAndUpdate(
      //     { _id: assessmentId },
      //     {
      //       ...dto,
      //       updatedBy: userId,
      //       updatedAt: new Date(),
      //     },
      //     { new: true },
      //   );

      // if (!updatedAssessment) {
      //   throw new NotFoundException('Assessment not found');
      // }

      return { data: assessment, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  async deleteCourseAssessment(assessmentId: string, userId: Types.ObjectId) {
    try {
      const assessment = await this.courseassessmentModel.findOneAndUpdate(
        { _id: assessmentId },
        {
          status: StatusType.DELETED,
          deletedBy: userId,
          updatedBy: userId,
        },
        { new: true },
      );

      await this.studentAssessmentModel.updateMany(
        {assessmentId},
        {
          status: StatusType.DELETED
        },
        {new: true}
      )

      await this.chapterModel.updateMany(
        {courseAssessmentId: assessmentId},
        {
          status: StatusType.DELETED
        },
        {new: true}
      )


      if (!assessment) {
        throw new NotFoundException('Assessment not found or already deleted');
      }

      return {
        data: assessment,
        err: null,
      };
    } catch (err) {
      return {
        data: null,
        err,
      };
    }
  }

  async addOrEditInstructions(
    assessmentId: string,
    dto: UpdateInstructionsDto,
    userId: Types.ObjectId,
  ) {
    try {
      const assessment =
        await this.courseassessmentModel.findById(assessmentId);

      assessment.instructions = {
        ...assessment.instructions,
        ...dto,
      };

      assessment.updatedBy = new Types.ObjectId(userId);

      await assessment.save();

      return { data: assessment, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async updateAssessmentStatus(
    assessmentId: string,
    userId: Types.ObjectId
  ) {
    try {
      const assessment = await this.courseassessmentModel.findById(assessmentId)

      if(!assessment) {
        return {data: null, err: 'Assessment not found.'}
      }

      const newStatus = assessment.status === StatusType.ACTIVE 
        ? StatusType.INACTIVE
        : StatusType.ACTIVE

      assessment.status = newStatus

      await assessment.save()

      return {data: assessment, err: null}
    } catch (error) {
      console.error('Error status change assessment:', error);
      return {data: null, err: error}
    }
  }
}

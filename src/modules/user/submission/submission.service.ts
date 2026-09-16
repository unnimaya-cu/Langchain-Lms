import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Submission } from './schema/submission.schema';
import { AssessmentService } from 'src/modules/assessment/assessment.service';
import { SubmissionDto } from './dto/submission.dto';
import { Chapter } from 'src/modules/chapter/schema/chapter.schema';
import { UserCourseChapter } from '../userCourseChapters/schema/usercourseschapters.schema';
import { UserCourses } from '../userCourses/schema/usercourses.schema';
import { UserChapterStatusType } from 'src/common/enum/userchapterstatus-type.enum';
import { CourseModule } from 'src/modules/coursemodule/schema/coursemodule.schema';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectModel(Submission.name)
    private readonly submissionModel: Model<Submission>,
    private assessmentService: AssessmentService,
    @InjectModel(Chapter.name)
    private readonly chapterModel: Model<Chapter>,
    @InjectModel(UserCourseChapter.name)
    private readonly userCourseChapterModel: Model<UserCourseChapter>,
    @InjectModel(UserCourses.name)
    private readonly userCoursesModel: Model<UserCourses>,
    @InjectModel(CourseModule.name)
    private readonly courseModuleModel: Model<CourseModule>
  ) {}

  async submitAnswers(dto: SubmissionDto,userId) {
    console.log('data ', dto);

    try {
      const {  assessmentId, questionOptions } = dto;
      console.log('assessid', assessmentId);

      const objectId = new Types.ObjectId(assessmentId);
      const assessmentData =
        await this.assessmentService.getAssessment(objectId);

      console.log('find assessment', assessmentData);

      let marks = 0;
      assessmentData.assessmentquestiondetails.forEach((question) => {
        const userAnswer = questionOptions.find(
          (q) => q.questionId === question._id.toString(),
        );

        
        if (userAnswer) {
          // const correctOption = question.options.find(
          //   (opt) => opt.correctAnswer,
          // );

          const correctAnswers = question.options
            .filter((opt) => opt.correctAnswer)
            .map((opt) => opt.optionName);

          const selectedAnswers = userAnswer.selectedAnswer || [];

          // if (
          //   correctOption &&
          //   userAnswer.selectedAnswer === correctOption.optionName
          // ) {
          //   marks += 1;
          // }
          const isCorrect =
            correctAnswers.length === selectedAnswers.length &&
            correctAnswers.every((answer) => selectedAnswers.includes(answer));

          if (isCorrect) {
            marks += 1;
          }
        }
      });
      console.log('marksd', marks);
      let submissionData;

      submissionData = await this.submissionModel.findOne({
        userId,
        assessmentId,
      });
      if (submissionData) {
        submissionData.marks = marks;
        submissionData.updatedAt = new Date();
        submissionData.updatedBy= userId

        await submissionData.save();
        // return {
        //   data: existingSubmission,
        // };
      } else {
        submissionData = new this.submissionModel({
          userId,
          assessmentId,
          marks,
          createdBy: userId,
          // updatedBy: userId,
          // createdAt: new Date(),
          // updatedAt: new Date(),
        });

        await submissionData.save();

        // return {
        //   data: newSubmission,
        // };
      }

      const chapter = await this.chapterModel.findOne({assessmentId: new Types.ObjectId(assessmentId)})
      .populate({
        path:'moduleId',
        select: 'courseId',
      })
      const userCourse = await this.userCoursesModel.findOne({
        userId: new Types.ObjectId(userId),
        courseId: (chapter?.moduleId as any)?.courseId,
      });
      
      if(chapter) {
        const userCourseChapter = await this.userCourseChapterModel.findOne({
          userCourseId: userCourse?._id,
          chapterId: chapter._id,
        });

        if(userCourseChapter) {
          userCourseChapter.status = UserChapterStatusType.COMPLETED;
          userCourseChapter.isCompleted = true;
          await userCourseChapter.save();
        }
      }
      // const submission = {
      //   userId,
      //   assessmentId,
      //   marks,
      //   createdAt: new Date(),
      // };

      return {
        data: submissionData,
        err: null,
      };
    } catch (err) {
      return { data: null, err: err };
    }
  }
}

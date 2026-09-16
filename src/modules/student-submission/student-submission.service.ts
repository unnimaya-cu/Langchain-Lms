import { Inject, Injectable } from '@nestjs/common';
import { CreateStudentSubmissionDto } from './dto/create-student-submission.dto';
import { UpdateStudentSubmissionDto } from './dto/update-student-submission.dto';
import { InjectModel } from '@nestjs/mongoose';
import { StudentSubmission } from './schema/student-submission.schema';
import mongoose, { Model, Types } from 'mongoose';
import { CourseAssessment } from '../course-assessment/schema/course-assessment.schema';
import { getOriginalGrade, getOriginalGradeFromPercentage, normalizeScore } from 'src/utils/normalizeScore';
import { StudentAssessmentStatus } from 'src/common/enum/student-assessment-status';
import { StudentAssessment } from '../student-assessment/schema/create-student-assessment.schema';
import { StudentSubmissionStatus } from 'src/common/enum/student-submission.enum';
import { GetStudentsDto } from './dto/get-students.dto';
import { QuestionType } from 'src/common/enum/question-type.enum';
import { AssessmentType } from 'src/common/enum/assessment-type.enum';
import { User } from '../user/schema/user.schema';
import { Group } from '../group/schema/group.schema';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationDocument, Notification } from '../notification/schema/notification.schema';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { GetTutorStudentsDto } from './dto/get-tutor-students.dto';
import { UserCourses } from '../user/userCourses/schema/usercourses.schema';
import { StudentTabDto } from './dto/student-tab.dto';
import { EmailService } from '../email/email.service';
import { UpdateScoreDto } from './dto/update-score.dto';
import { StatusType } from 'src/common/enum/status-type.enum';
import { GetGradebookDto } from './dto/grade-book.dto';
import { Course } from '../course/schema/course.schema';
import { CourseModule } from '../coursemodule/schema/coursemodule.schema';
import { Connection } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Chapter } from '../chapter/schema/chapter.schema';
import { UserCourseChapter } from '../user/userCourseChapters/schema/usercourseschapters.schema';
import { UserChapterStatusType } from 'src/common/enum/userchapterstatus-type.enum';

@Injectable()
export class StudentSubmissionService {
  constructor(
    @InjectModel(StudentSubmission.name)
    private readonly studentSubmissionModel: Model<StudentSubmission>,
    @InjectModel(CourseAssessment.name)
    private readonly courseAssessmentModel: Model<CourseAssessment>,
    @InjectModel(StudentAssessment.name)
    private readonly studentAssessmentModel: Model<StudentAssessment>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(UserCourses.name)
    private readonly userCoursesModel: Model<UserCourses>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    @InjectModel(CourseModule.name)
    private readonly courseModule: Model<CourseModule>,
    @InjectModel(Chapter.name)
    private readonly chapterModel: Model<Chapter>,
    @InjectModel(UserCourseChapter.name)
    private readonly userCourseChapterModel: Model<UserCourseChapter>,
    @InjectConnection()
    private readonly connection: Connection,
  ) { }
  async create(dto: CreateStudentSubmissionDto, userId: string) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const assessment = await this.courseAssessmentModel.findById(dto.assessmentId)

      if (!assessment) {
         await session.abortTransaction();
        return { data: null, err: 'Assessment not found.' }
      }

      let studentAssessment;
      let chapter;
      // let userCourseChapter;
      if (dto.studentAssessmentId) {
        studentAssessment = await this.studentAssessmentModel.findById(dto.studentAssessmentId);
      } else {
        studentAssessment = await this.studentAssessmentModel.findOne({
          assessmentId: dto.assessmentId,
          studentId: userId,
        });

        if (!studentAssessment) {
          // Verify if student is enrolled in the parent course
          const userCourse = await this.userCoursesModel.findOne({
            userId: new Types.ObjectId(userId),
            courseId: assessment.courseId,
          });

          if (!userCourse) {
            await session.abortTransaction();
            return { data: null, err: 'Student is not enrolled in this course.' };
          }

          // userCourseChapter = await this.userCourseChapterModel.findOne({
          //   userCourseId:userCourse._id,
          //   chapterId: dto.chapterId
          // })

          // chapter = await this.chapterModel.findOne({ courseAssessmentId: assessment._id });
          chapter = await this.chapterModel.findById(dto.chapterId);
          
          const duration = chapter?.durationInSec ? Math.ceil(chapter.durationInSec / 60) : 0;
          // Automatically enroll student in this assessment
          const createdAssessments = await this.studentAssessmentModel.create([{
            categoryId: assessment.categoryId.toString(),
            courseId: assessment.courseId.toString(),
            assessmentId: assessment._id.toString(),
            studentId: userId,
            submissionStatus: StudentAssessmentStatus.PENDING,
            status: StatusType.ACTIVE,
            duration: duration,
            dueDate: chapter?.dueDate || null,
            createdBy: assessment.createdBy,
            updatedBy: assessment.createdBy,
          }], { session });
          studentAssessment = createdAssessments[0];
        }
      }

      if (!studentAssessment) {
         await session.abortTransaction();
        return { data: null, err: 'Student Assessment not found.' }
      }

      const lastSubmission = await this.studentSubmissionModel.findOne({
        studentAssessmentId: studentAssessment._id,
        studentId: userId
      }).sort({ attemptNumber: -1 })
        .populate('assessmentId')

      const allowedAttempts = assessment?.instructions?.allowedAttempts;

      const nextAttemptNumber = lastSubmission ? lastSubmission.attemptNumber + 1 : 1;

      if (lastSubmission && lastSubmission.submissionStatus === StudentSubmissionStatus.IN_PROGRESS) {
         await session.abortTransaction();
        return { data: lastSubmission, err: null }
      }

      if (nextAttemptNumber > allowedAttempts) {
         await session.abortTransaction();
        return { data: null, err: 'Maximum attempts exceeded.' };
      }

      // if (studentAssessment) {
        studentAssessment.submissionStatus = StudentAssessmentStatus.IN_PROGRESS;
        await studentAssessment.save({session});
      // }

      const startedAt = new Date();

      const durationMs = (studentAssessment.duration ?? 0) * 60 * 1000;

      const endTime = new Date(startedAt.getTime() + durationMs);

      const submission = await this.studentSubmissionModel.create([{
        studentAssessmentId: studentAssessment._id,
        assessmentId: dto.assessmentId,
        chapterId: dto?.chapterId || chapter?._id,
        studentId: userId,
        questionSnapshot: assessment.questions,
        assessmentType: assessment.assessmentType,
        startedAt,
        // serverNow: new Date().toISOString(),
        serverNow: new Date(),
        assignedBy: studentAssessment.createdBy,
        attemptNumber: nextAttemptNumber,
        endTime
      }], {session})

      if(dto.chapterId) {
        const userCourse = await this.userCoursesModel.findOne({
          userId: new Types.ObjectId(userId),
          courseId: assessment.courseId,
        });

        if(userCourse) {
         const userCourseChapter = await this.userCourseChapterModel.findOne({
            userCourseId:userCourse._id,
            chapterId: dto.chapterId
          })
          if(userCourseChapter) {
            userCourseChapter.status = UserChapterStatusType.INPROGRESS
            await userCourseChapter.save()
          }
        }
      }



      await session.commitTransaction();

      return { data: submission[0], err: null }
    } catch (error) {
      await session.abortTransaction();
      return { data: null, err: error }
    }finally {
      await session.endSession();
    }
  }

  async update(submissionId: string, dto: UpdateStudentSubmissionDto, userId: string) {
    try {
      const submission = await this.studentSubmissionModel.findById(submissionId)

      if (!submission) {
        return { data: null, err: 'Submission not found.' }
      }

      if (submission.studentId.toString() !== userId) {
        return { data: null, err: 'Unauthorized access.' };
      }

      const now = new Date();

      const studentAssessment = await this.studentAssessmentModel.findOne({
        assessmentId: submission.assessmentId,
        studentId: submission.studentId
      });

      if (studentAssessment?.submissionStatus === StudentAssessmentStatus.EXPIRED) {
        return { data: null, err: 'Assessment has expired.' };
      }

      if (studentAssessment?.dueDate && now > new Date(studentAssessment.dueDate)) {
        return { data: null, err: 'Due date has passed and cannot submit assessment.' };
      }
      
      const existingIndex = submission.studentAnswers.findIndex(
        (a) => a.questionId.toString() === dto.questionId
      )

      if (existingIndex !== -1) {
        submission.studentAnswers[existingIndex] = {
          ...submission.studentAnswers[existingIndex],
          ...dto,
          _id: submission.studentAnswers[existingIndex]._id
        }
      }
      else {
        submission.studentAnswers.push(dto)
      }

      await submission.save()
      return { data: submission, err: null }
    } catch (error) {
      return { data: null, err: error }
    }
  }

  async submitAssessment(submissionId: string, dto: UpdateStudentSubmissionDto, userId: string) {
    try {
      const submission = await this.studentSubmissionModel.findById(submissionId);

      if (!submission) {
        return { data: null, err: 'Submission not found.' };
      }

      if (submission.studentId.toString() !== userId) {
        return { data: null, err: 'Unauthorized access.' };
      }

      if (submission.submissionStatus === StudentSubmissionStatus.SUBMITTED) {
        return { data: null, err: 'Assessment already submitted.' };
      }

      if (submission.submissionStatus !== StudentSubmissionStatus.IN_PROGRESS) {
        return { data: null, err: 'Submission is not active.' };
      }

      const now = new Date();
      
      if (!dto.isAutoSubmit && submission.endTime && now > new Date(submission.endTime)) {
        return { data: null, err: 'Time limit exceeded' };
      }

      const studentAssessment = await this.studentAssessmentModel.findOne({
        assessmentId: submission.assessmentId,
        studentId: submission.studentId
      });

      if (studentAssessment?.submissionStatus === StudentAssessmentStatus.EXPIRED) {
        return { data: null, err: 'Assessment has expired.' };
      }

      if (studentAssessment?.dueDate && now > new Date(studentAssessment.dueDate)) {
        return { data: null, err: 'Due date has passed and cannot submit assessment.' };
      }

      const questions = submission.questionSnapshot;
      let totalNormalizedScore = 0;
      let gradedQuestions = 0;

      const OBJECTIVE_TYPES = [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK];

      const isOnlyObjective =
        submission.assessmentType === AssessmentType.QUIZ &&
        submission.questionSnapshot.every((q: any) =>
          OBJECTIVE_TYPES.includes(q.questionType)
        );

      for (const answer of submission.studentAnswers) {
        const question = questions.find(
          q => q._id.toString() === answer.questionId.toString()
        );
        if (!question) continue;

        let questionScore = 0;
        let questionOriginalGrade: string | number = null;

        if (answer.questionType === 'mcq') {
          const correctAnswers = question.answers.filter(a => a.isAnswer);

          const correctSet = correctAnswers.map(a => a.choice.toLowerCase()).sort();
          const selectedSet = (answer.selectedChoices || []).map((s: string) => s.toLowerCase()).sort();

          const isExactMatch =
            correctSet.length === selectedSet.length &&
            correctSet.every((val, i) => val === selectedSet[i]);

          const maxPoints = correctAnswers
            .reduce((sum, a) => sum + normalizeScore(a.grade, question.gradingMethod), 0);

          let studentPoints = 0;
          for (const selected of answer.selectedChoices || []) {
            const matched = correctAnswers.find(
              a => a.choice.toLowerCase() === selected.toLowerCase()
            );
            if (matched) {
              studentPoints += normalizeScore(matched.grade, question.gradingMethod);
            }
          }

          // if (!isExactMatch) {
          //   questionScore = 0;
          // } else {
          //   questionScore = maxPoints > 0 ? (studentPoints / maxPoints) * 100 : 0;
          // }

          questionScore = maxPoints > 0 ? (studentPoints / maxPoints) * 100 : 0;
          questionOriginalGrade = getOriginalGradeFromPercentage(questionScore, question.gradingMethod);

          answer.score = Number(questionScore.toFixed(2));
          answer.originalGrade = questionOriginalGrade;

          gradedQuestions++;
        }
        else if (answer.questionType === 'true_false') {
          const correctAnswer = question.answers[0]?.correctAnswer;
          if (correctAnswer === answer.correctAnswer) {
            questionScore = normalizeScore(question.answers[0].grade, question.gradingMethod);
          } else {
            questionScore = 0;
          }
          questionOriginalGrade = getOriginalGradeFromPercentage(questionScore, question.gradingMethod);

          answer.score = Number(questionScore.toFixed(2));
          answer.originalGrade = questionOriginalGrade;

          gradedQuestions++;
        }
        else if (answer.questionType === 'fill_blank') {
          const placeholders = question.answers[0]?.placeholders || [];
          const maxPoints = placeholders.reduce(
            (sum, ph) => sum + normalizeScore(ph.grade, question.gradingMethod),
            0
          );

          let studentPoints = 0;
          for (const ph of placeholders) {
            const studentPH = (answer.placeholders || []).find(
              p => p.placeholderIndex === ph.placeholderIndex
            );
            if (!studentPH) continue;

            const correctChoices = (ph.choices || []).map(c => c.toLowerCase());
            const studentValue = ((studentPH.value || studentPH.choices?.[0]) || '').toLowerCase();
            if (correctChoices.includes(studentValue)) {
              studentPoints += normalizeScore(ph.grade, question.gradingMethod);
            }
          }

          questionScore = maxPoints > 0 ? (studentPoints / maxPoints) * 100 : 0;
          questionOriginalGrade = getOriginalGradeFromPercentage(questionScore, question.gradingMethod);

          answer.score = Number(questionScore.toFixed(2));
          answer.originalGrade = questionOriginalGrade;

          gradedQuestions++;
        }

        totalNormalizedScore += questionScore;
      }

      const finalScore = gradedQuestions > 0
        ? Number((totalNormalizedScore / gradedQuestions).toFixed(2))
        : 0;

      if (studentAssessment) studentAssessment.submissionStatus = StudentAssessmentStatus.SUBMITTED;

      submission.submittedAt = new Date();
      submission.submissionStatus = StudentSubmissionStatus.SUBMITTED;
      submission.objectiveScore = finalScore;

      await submission.save();
      if (studentAssessment) await studentAssessment.save();
      // console.log('isOnlyObjective', isOnlyObjective)
      if (isOnlyObjective) {
        await this.calculateTotalScore(submissionId, userId);
      }

      // Mark the corresponding course chapter as completed for the student
      if(submission?.chapterId) {
        const chapter = await this.chapterModel.findById(submission?.chapterId)
          .populate({
            path: 'moduleId',
            select: 'courseId',
          });
        
        if (chapter) {
          const userCourse = await this.userCoursesModel.findOne({
            userId: new Types.ObjectId(userId),
            courseId: (chapter?.moduleId as any)?.courseId,
          });

          if (userCourse) {
            const userCourseChapter = await this.userCourseChapterModel.findOne({
              userCourseId: userCourse._id,
              chapterId: chapter._id,
            });

            if (userCourseChapter) {
              userCourseChapter.status = UserChapterStatusType.COMPLETED;
              userCourseChapter.isCompleted = true;
              await userCourseChapter.save();
            }
          }
        }
      }

      return { data: submission, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  // async getStudents(tutorId: string, dto: GetTutorStudentsDto, userId: string) {
  //   try {
  //     const user = await this.userModel.findById(new Types.ObjectId(userId))
  //     .populate('roleId')
  //     .select('roleId')

  //     let isSuperAdmin = false

  //     if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
  //       isSuperAdmin = true
  //     }

  //     const searchQuery: any[] = [
  //       ...(isSuperAdmin ? [] : [{$match:{assignedBy: new Types.ObjectId(userId)}}]),
  //       {
  //         $match: {
  //           // assignedBy: new mongoose.Types.ObjectId(tutorId),
  //           // submissionStatus: StudentSubmissionStatus.SUBMITTED
  //         }
  //       },
  //       {
  //         $lookup: {
  //           from: 'users',
  //           localField: 'studentId',
  //           foreignField: '_id',
  //           as: 'studentDetails',
  //         }
  //       },
  //       {
  //         $unwind: '$studentDetails'
  //       },
  //       {
  //         $lookup: {
  //           from : 'usercourses',
  //           localField: 'studentDetails._id',
  //           foreignField: 'userId',
  //           as: 'enrollmentDetails'
  //         }
  //       },
  //       {
  //         $unwind: '$enrollmentDetails'
  //       },
  //       // {
  //       //   $lookup:{
  //       //     from:'studentassessments',
  //       //     localField:'studentDetails._id',
  //       //     foreignField:'studentId',
  //       //     as:'studentAssessments'
  //       //   }
  //       // },
  //       // {
  //       //   $unwind:'$studentAssessments'
  //       // },
  //       {
  //         $lookup: {
  //           from: 'studentassessments',
  //           let: {
  //             studentId: '$studentDetails._id'
  //           },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $and: [
  //                     { $eq: ['$studentId', '$$studentId'] },
  //                     ...(!isSuperAdmin
  //                       ? [{ $eq: ['$createdBy', new Types.ObjectId(tutorId)] }]
  //                       : [])
  //                   ]
  //                 }
  //               }
  //             }
  //           ],
  //           as: 'studentAssessments'
  //         }
  //       },
  //       {
  //         $unwind:'$studentAssessments'
  //       },
  //     ]

  //     if (dto?.search) {
  //       const escapedSearch = dto.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  //       const searchRegex = new RegExp(escapedSearch, 'i');

  //       searchQuery.push({
  //         $match: {
  //           $or: [
  //             { 'studentDetails.firstName': { $regex: searchRegex } },
  //             { 'studentDetails.lastName': { $regex: searchRegex } },
  //             {
  //               $expr: {
  //                 $regexMatch: {
  //                   input: { $concat: ['$studentDetails.firstName', ' ', '$studentDetails.lastName'] },
  //                   regex: searchRegex
  //                 }
  //               }
  //             },
  //             { 'studentDetails.email': { $regex: searchRegex } },
  //             { 'studentDetails.userCode': { $regex: searchRegex } },
  //           ]
  //         }
  //       })
  //     }

  //     if (dto?.courseId) {
  //       searchQuery.push(
  //         {
  //           $match: {
  //             'enrollmentDetails.courseId': new Types.ObjectId(dto.courseId)
  //           }
  //         }
  //       )
  //     }

  //     const submissionStatus = dto?.submissionStatus || 'all';
  //     if (submissionStatus !== 'all') {
  //       searchQuery.push(
  //         {
  //           $match: {
  //             'studentAssessments.submissionStatus': dto.submissionStatus
  //           }
  //         }
  //       )
  //     }
  //     searchQuery.push(
  //       {
  //         $group: {
  //           _id: {
  //             studentId: '$studentDetails._id',
  //             assessmentId: '$assessmentId'
  //           },
  //           userCode: { $first: '$studentDetails.userCode' },
  //           firstName: { $first: '$studentDetails.firstName' },
  //           lastName: { $first: '$studentDetails.lastName' },
  //           email: { $first: '$studentDetails.email' },
  //           lastActive: { $first: '$studentDetails.lastLogin' },
  //           profileImg: { $first: '$studentDetails.profileImg' },
  //           submittedDate: { $max: '$submittedAt' },
  //           courseSet: { $addToSet: '$enrollmentDetails.courseId' },
  //           pendingAssessmentSet: {
  //             $addToSet: {
  //               $cond: [
  //                 {
  //                   // $eq: [
  //                   //   '$studentAssessments.submissionStatus',
  //                   //   StudentAssessmentStatus.PENDING
  //                   // ]
  //                   $in: [
  //                     '$studentAssessments.submissionStatus',
  //                     [
  //                       StudentAssessmentStatus.PENDING,
  //                       StudentAssessmentStatus.IN_PROGRESS
  //                     ]
  //                   ]
  //                 },
  //                 '$studentAssessments._id',
  //                 '$$REMOVE'
  //               ]
  //             }
  //           },
            
  //         }
  //       },
  //       {
  //         $group: {
  //           _id: '$_id.studentId',
  //           userCode: { $first: '$userCode' },
  //           firstName: { $first: '$firstName' },
  //           lastName: { $first: '$lastName' },
  //           email: { $first: '$email' },
  //           profileImg: { $first: '$profileImg' },
  //           lastActive: { $first: '$lastActive' },
  //           submissionsCount: { $sum: 1 },
  //           submittedDate: { $max: '$submittedDate' },
  //           coursesEnrolled: { $first: { $size: { $ifNull: ['$courseSet', []] } } },
  //           pendingAssessmentsCount: {
  //             $first: {
  //               $size: {
  //                 $ifNull: ['$pendingAssessmentSet', []]
  //               }
  //             }
  //           }
  //         }
  //       },
  //       {
  //         $addFields: {
  //           nameTitleLower: {
  //             $toLower: {
  //               $concat: ['$firstName', ' ', '$lastName']
  //             }
  //           }
  //         }
  //       }
  //     )

  //     let sortStage: any = { lastActive: -1 };

  //     if(dto?.sortBy) {
  //       switch(dto.sortBy.toLowerCase()) {
  //         case 'recentlyactive':
  //           sortStage = {lastActive: -1};
  //           break;
  //         case 'nameasc':
  //           sortStage = {nameTitleLower: 1};
  //           break;
  //         case 'namedesc':
  //           sortStage = {nameTitleLower: -1};
  //           break;
  //         case 'mostsubmissions':
  //           sortStage = {submissionsCount: -1, _id: 1};
  //           break;
  //         case 'leastsubmissions':
  //           sortStage = {submissionsCount: 1, _id: 1};
  //           break;
  //         case 'mostpendingassessments':
  //           sortStage = {pendingAssessmentsCount: -1, _id: 1};
  //           break;
  //         case 'leastpendingassessments':
  //           sortStage = {pendingAssessmentsCount: 1, _id: 1};
  //           break;
  //         default:
  //           sortStage = {lastActive: -1};
  //       }
  //     }

  //     const totalStudentsResult = await this.studentSubmissionModel.aggregate([
  //       ...searchQuery,
  //       {
  //         $count: 'total',
  //       },
  //     ]);

  //     const totalStudents = totalStudentsResult[0]?.total || 0;

  //     const students = await this.studentSubmissionModel.aggregate([
  //       ...searchQuery,
  //       { $sort: sortStage },
  //       { $skip: dto.startIndex || 0 },
  //       { $limit: dto.noOfItems || 10 },
  //       {
  //         $project: {
  //           userCode: 1,
  //           firstName: 1,
  //           lastName: 1,
  //           email: 1,
  //           profileImg: {
  //             $ifNull:['$profileImg', null]
  //           },
  //           submissionsCount: 1,
  //           submittedDate: 1,
  //           coursesEnrolled: 1,
  //           pendingAssessments: '$pendingAssessmentsCount',
  //           lastActive: 1
  //         }
  //       }
  //     ])

  //     return { data: { 
  //       data: students, totalStudents,
  //       totalPages: Math.ceil(totalStudents/ (dto.noOfItems || 10)),
  //       currentPage: Math.floor((dto.startIndex || 0) / (dto.noOfItems || 10)) + 1
  //     } as any, err: null }
  //   } catch (error) {
  //     return { data: null, err: error }
  //   }
  // }

  async getStudents(tutorId: string, dto: GetTutorStudentsDto, userId: string) {
    try {
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery: any[] = [
        ...(isSuperAdmin
        ? []
        : [{
            $match: {
              createdBy: new Types.ObjectId(tutorId)
            }
          }]),
        // ...(isSuperAdmin ? [] : [{$match:{createdBy: new Types.ObjectId(userId)}}]),
        {
          $match: {
            // assignedBy: new mongoose.Types.ObjectId(tutorId),
            // submissionStatus: StudentSubmissionStatus.SUBMITTED
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'studentDetails',
          }
        },
        {
          $unwind: '$studentDetails'
        },
        {
          $lookup: {
            from : 'usercourses',
            localField: 'studentDetails._id',
            foreignField: 'userId',
            as: 'enrollmentDetails'
          }
        },
        {
          $unwind: '$enrollmentDetails'
        },
        // {
        //   $lookup:{
        //     from:'studentassessments',
        //     localField:'studentDetails._id',
        //     foreignField:'studentId',
        //     as:'studentAssessments'
        //   }
        // },
        // {
        //   $unwind:'$studentAssessments'
        // },
        // {
        //   $lookup: {
        //     from: 'studentassessments',
        //     let: {
        //       studentId: '$studentDetails._id'
        //     },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: {
        //             $and: [
        //               { $eq: ['$studentId', '$$studentId'] },
        //               ...(!isSuperAdmin
        //                 ? [{ $eq: ['$createdBy', new Types.ObjectId(tutorId)] }]
        //                 : [])
        //             ]
        //           }
        //         }
        //       }
        //     ],
        //     as: 'studentAssessments'
        //   }
        // },
        // {
        //   $unwind:'$studentAssessments'
        // },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: {
              studentAssessmentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      '$studentAssessmentId',
                      '$$studentAssessmentId'
                    ]
                  }
                }
              },
              {
                $sort: {
                  attemptNumber: -1
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'studentSubmission'
          }
        },
        {
          $unwind: {
            path: '$studentSubmission',
            preserveNullAndEmptyArrays: true
          }
        },
      ]

      if (dto?.search) {
        const escapedSearch = dto.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const searchRegex = new RegExp(escapedSearch, 'i');

        searchQuery.push({
          $match: {
            $or: [
              { 'studentDetails.firstName': { $regex: searchRegex } },
              { 'studentDetails.lastName': { $regex: searchRegex } },
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ['$studentDetails.firstName', ' ', '$studentDetails.lastName'] },
                    regex: searchRegex
                  }
                }
              },
              { 'studentDetails.email': { $regex: searchRegex } },
              { 'studentDetails.userCode': { $regex: searchRegex } },
            ]
          }
        })
      }

      if (dto?.courseId) {
        searchQuery.push(
          {
            $match: {
              'enrollmentDetails.courseId': new Types.ObjectId(dto.courseId),
              'courseId': new Types.ObjectId(dto.courseId)
            }
          }
        )
      }

      // const submissionStatus = dto?.submissionStatus || 'all';
      // if (submissionStatus !== 'all') {
      //   searchQuery.push(
      //     {
      //       $match: {
      //         'studentAssessments.submissionStatus': dto.submissionStatus
      //       }
      //     }
      //   )
      // }
      searchQuery.push(
        {
          $group: {
            _id: {
              studentId: '$studentDetails._id',
              assessmentId: '$assessmentId'
            },
            userCode: { $first: '$studentDetails.userCode' },
            firstName: { $first: '$studentDetails.firstName' },
            lastName: { $first: '$studentDetails.lastName' },
            email: { $first: '$studentDetails.email' },
            lastActive: { $first: '$studentDetails.lastLogin' },
            profileImg: { $first: '$studentDetails.profileImg' },
            submittedDate: { $max: '$studentSubmission.submittedAt' },
            courseSet: { $addToSet: '$enrollmentDetails.courseId' },
            pendingAssessmentSet: {
              $addToSet: {
                $cond: [
                  {
                    // $eq: [
                    //   '$studentAssessments.submissionStatus',
                    //   StudentAssessmentStatus.PENDING
                    // ]
                    $in: [
                      '$submissionStatus',
                      [
                        StudentAssessmentStatus.PENDING,
                        StudentAssessmentStatus.IN_PROGRESS
                      ]
                    ]
                  },
                  '$assessmentId',
                  '$$REMOVE'
                ]
              }
            },
            submittedAssessmentSet: {
              $addToSet: {
                $cond: [
                  {
                    $eq: [
                      '$studentSubmission.submissionStatus',
                      StudentSubmissionStatus.SUBMITTED
                    ]
                  },
                  '$_id',
                  '$$REMOVE'
                ]
              }
            },
          }
        },
        {
          $group: {
            _id: '$_id.studentId',
            userCode: { $first: '$userCode' },
            firstName: { $first: '$firstName' },
            lastName: { $first: '$lastName' },
            email: { $first: '$email' },
            profileImg: { $first: '$profileImg' },
            lastActive: { $first: '$lastActive' },
            // submissionsCount: { $sum: 1 },
            // submissionsCount: {
            //   $first: {
            //     $size: {
            //       $ifNull: [
            //         '$submittedAssessmentSet',
            //         []
            //       ]
            //     }
            //   }
            // },
            submittedDate: { $max: '$submittedDate' },
            coursesEnrolled: { $first: { $size: { $ifNull: ['$courseSet', []] } } },
            // pendingAssessmentsCount: {
            //   $first: {
            //     $size: {
            //       $ifNull: ['$pendingAssessmentSet', []]
            //     }
            //   }
            // }
            pendingAssessmentsCount: {
              $sum: {
                $size: {
                  $ifNull: ['$pendingAssessmentSet', []]
                }
              }
            },

            submissionsCount: {
              $sum: {
                $size: {
                  $ifNull: ['$submittedAssessmentSet', []]
                }
              }
            }
          }
        },
        {
          $addFields: {
            nameTitleLower: {
              $toLower: {
                $concat: ['$firstName', ' ', '$lastName']
              }
            }
          }
        }
      )

      const submissionStatus = dto?.submissionStatus || 'all';

      if (
        submissionStatus === StudentAssessmentStatus.PENDING ||
        submissionStatus === StudentAssessmentStatus.IN_PROGRESS
      ) {
        searchQuery.push({
          $match: {
            pendingAssessmentsCount: { $gt: 0 },
          },
        });
      } else if (submissionStatus === StudentSubmissionStatus.SUBMITTED) {
        searchQuery.push({
          $match: {
            submissionsCount: { $gt: 0 },
          },
        });
      }

      let sortStage: any = { lastActive: -1 };

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'recentlyactive':
            sortStage = {lastActive: -1};
            break;
          case 'nameasc':
            sortStage = {nameTitleLower: 1};
            break;
          case 'namedesc':
            sortStage = {nameTitleLower: -1};
            break;
          case 'mostsubmissions':
            sortStage = {submissionsCount: -1, _id: 1};
            break;
          case 'leastsubmissions':
            sortStage = {submissionsCount: 1, _id: 1};
            break;
          case 'mostpendingassessments':
            sortStage = {pendingAssessmentsCount: -1, _id: 1};
            break;
          case 'leastpendingassessments':
            sortStage = {pendingAssessmentsCount: 1, _id: 1};
            break;
          default:
            sortStage = {lastActive: -1};
        }
      }

      const totalStudentsResult = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalStudents = totalStudentsResult[0]?.total || 0;

      const students = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        { $sort: sortStage },
        { $skip: dto.startIndex || 0 },
        { $limit: dto.noOfItems || 10 },
        {
          $project: {
            userCode: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            profileImg: {
              $ifNull:['$profileImg', null]
            },
            submissionsCount: 1,
            submittedDate: 1,
            coursesEnrolled: 1,
            pendingAssessments: '$pendingAssessmentsCount',
            lastActive: 1
          }
        }
      ])

      return { data: { 
        data: students, totalStudents,
        totalPages: Math.ceil(totalStudents/ (dto.noOfItems || 10)),
        currentPage: Math.floor((dto.startIndex || 0) / (dto.noOfItems || 10)) + 1
      } as any, err: null }
    } catch (error) {
      return { data: null, err: error }
    }
  }

  async getStudentProfile(studentId: string, userId: string) {
    try{
      const user = await this.userModel.findById({_id: new Types.ObjectId(studentId)})

      if(!user) {
        return {data: null, err:"Student not found."}
      }

      const tutorId = new Types.ObjectId(userId);

      const tutor = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(tutor && ((tutor.roleId as any).roleName === 'admin' ||(tutor.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const userCourses = await this.userCoursesModel.distinct('courseId', {
        userId: new Types.ObjectId(studentId)
      }).then(courseIds => courseIds.length);

      const [submitted, pendingReview, reviewed] = await Promise.all([
        this.studentAssessmentModel.countDocuments({
          studentId: new Types.ObjectId(studentId),
          submissionStatus: StudentSubmissionStatus.SUBMITTED, 
          // isGraded: false,
          // createdBy: tutorId
          ...(!isSuperAdmin && {
            createdBy: new Types.ObjectId(tutorId)
          })
        }),
        this.studentSubmissionModel.countDocuments({
          studentId: new Types.ObjectId(studentId),
          submissionStatus: StudentSubmissionStatus.SUBMITTED, 
          isGraded: false,
        }),
        this.studentSubmissionModel.countDocuments({
          studentId: new Types.ObjectId(studentId),
          submissionStatus: StudentSubmissionStatus.SUBMITTED, 
          isGraded: true,
          // gradedBy: tutorId
          ...(!isSuperAdmin && {
            gradedBy: new Types.ObjectId(tutorId)
          })
        }),
      ])

      const pendingSubmissions = await this.studentAssessmentModel.countDocuments({
        studentId: new Types.ObjectId(studentId),
        submissionStatus: {
          $in:[
            StudentAssessmentStatus.IN_PROGRESS,
            StudentAssessmentStatus.PENDING,
          ]
        },
        // createdBy: tutorId
        ...(!isSuperAdmin && {
          createdBy: new Types.ObjectId(tutorId)
        })
      })

      const searchQuery: any[] = [
        {
          $match:{
            userId: new Types.ObjectId(studentId),
          }
        },
        {
          $sort: {
            createdAt: 1
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              courseId: '$courseId'
            },
            doc: {
              $first: '$$ROOT'
            }
          }
        },
        {
          $replaceRoot: {
            newRoot: '$doc'
          }
        },
        {
          $lookup:{
            from:'courses',
            localField:'courseId',
            foreignField:'_id',
            as:'courseDetails'
          }
        }, 
        {
          $unwind:'$courseDetails'
        },
        {
          $lookup:{
            from:'users',
            localField:'courseDetails.createdBy',
            foreignField:'_id',
            as:'tutorDetails'
          }
        },
        {
          $unwind:'$tutorDetails'
        },
        {
          $lookup:{
            from:'categories',
            localField:'courseDetails.categoryId',
            foreignField:'_id',
            as:'categoryDetails'
          }
        }, 
        {
          $unwind:'$categoryDetails'
        },
        {
          $lookup:{
            from:'coursemodules',
            localField:'courseDetails._id',
            foreignField:'courseId',
            as:'courseModules'
          }
        },
        {
          $lookup: {
            from: 'studentassessments',
            let: {
              courseId: '$courseDetails._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$courseId', '$$courseId'] },
                      { $eq: ['$studentId', new Types.ObjectId(studentId)] },
                      ...(!isSuperAdmin
                        ? [{ $eq: ['$createdBy', new Types.ObjectId(userId)] }]
                        : [])
                    ]
                  }
                }
              }
            ],
            as: 'studentAssessments'
          }
        },
        {
          $match: {
            'studentAssessments.0': { $exists: true }
          }
        },
        {
          $lookup:{
            from:'studentsubmissions',
            localField:'studentAssessments._id',
            foreignField:'studentAssessmentId',
            as:'studentSubmissions'
          }
        },
        {
          $addFields: {
            total: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentAssessments', []] },
                  as: 'a',
                  cond: {
                    $eq: ['$$a.studentId', new Types.ObjectId(studentId)]
                  }
                }
              }
            }
          }
        },
        {
          $addFields: {
            courseTitleLower: {
              $toLower: '$courseDetails.title'
            }
          }
        }
      ]

      const totalCoursesResult = await this.userCoursesModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const data = {
        user: {
          _id: user._id,
          profileImg: user.profileImg || null,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          userCode:user.userCode,
          email: user.email,
          joinedDate: user.joinedDate || user.createdAt,
          coursesEnrolled: userCourses || 0,
        },
        metrics: {
          courses: totalCoursesResult[0]?.total || 0,
          submitted,
          pendingSubmissions,
          // pendingReview,
          reviewed
        }
      }

      return {data: data, err:null}
    }catch(error) {
      return {data: null, err: error}
    }
  }

  async getStudentSubmissionsData(studentId: string, dto:StudentTabDto, userId: string) {
    try{

      switch(dto.tab) {
        // case 'pending_review':
        //   return this.getPendingReviews(studentId, dto, userId)
        case 'courses':
          return this.getCourses(studentId, dto, userId)
        case 'pendingSubmissions':
          return this.getPendingSubmissions(studentId, dto, userId)
        case 'submitted':
          return this.getSubmittedAssessments(studentId, dto, userId)
        default:
          return {
            data: [],
            err: 'Invalid tab'
          };
      }

      // return {data: null, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getCourses(studentId: string, dto: StudentTabDto, userId: string) {
    try{
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery: any[] = [
        {
          $match:{
            userId: new Types.ObjectId(studentId),
          }
        },
        {
          $sort: {
            createdAt: 1
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              courseId: '$courseId'
            },
            doc: {
              $first: '$$ROOT'
            }
          }
        },
        {
          $replaceRoot: {
            newRoot: '$doc'
          }
        },
        {
          $lookup:{
            from:'courses',
            localField:'courseId',
            foreignField:'_id',
            as:'courseDetails'
          }
        }, 
        {
          $unwind:'$courseDetails'
        },
        {
          $lookup:{
            from:'users',
            localField:'courseDetails.createdBy',
            foreignField:'_id',
            as:'tutorDetails'
          }
        },
        {
          $unwind:'$tutorDetails'
        },
        {
          $lookup:{
            from:'categories',
            localField:'courseDetails.categoryId',
            foreignField:'_id',
            as:'categoryDetails'
          }
        }, 
        {
          $unwind:'$categoryDetails'
        },
        {
          $lookup:{
            from:'coursemodules',
            localField:'courseDetails._id',
            foreignField:'courseId',
            as:'courseModules'
          }
        },
        {
          $lookup: {
            from: 'chapters',
            let: {
              moduleIds: '$courseModules._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$moduleId', '$$moduleIds']
                  },
                  status: { $ne: StatusType.DELETED}
                }
              }
            ],
            as: 'chapters'
          }
        },
        {
          $lookup: {
            from: 'studentassessments',
            let: {
              courseId: '$courseDetails._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$courseId', '$$courseId'] },
                      { $eq: ['$studentId', new Types.ObjectId(studentId)] },
                      ...(!isSuperAdmin
                        ? [{ $eq: ['$createdBy', new Types.ObjectId(userId)] }]
                        : [])
                    ]
                  }
                }
              }
            ],
            as: 'studentAssessments'
          }
        },
        {
          $match: {
            'studentAssessments.0': { $exists: true }
          }
        },
        // {
        //   $lookup:{
        //     from:'studentsubmissions',
        //     localField:'studentAssessments._id',
        //     foreignField:'studentAssessmentId',
        //     as:'studentSubmissions'
        //   }
        // },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: {
              assessmentIds: '$studentAssessments._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$studentAssessmentId', '$$assessmentIds']
                  }
                }
              },
              {
                $sort: {
                  attemptNumber: -1
                }
              },
              {
                $group: {
                  _id: '$studentAssessmentId',
                  latestSubmission: {
                    $first: '$$ROOT'
                  }
                }
              },
              {
                $replaceRoot: {
                  newRoot: '$latestSubmission'
                }
              }
            ],
            as: 'studentSubmissions'
          }
        },
        {
          $addFields: {
            total: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentAssessments', []] },
                  as: 'a',
                  cond: {
                    $eq: ['$$a.studentId', new Types.ObjectId(studentId)]
                  }
                }
              }
            },
            totalDurationInSec: {
              $sum: {
                $map: {
                  input: {
                    $ifNull: ['$chapters', []]
                  },
                  as: 'chapter',
                  in: {
                    $ifNull: ['$$chapter.durationInSec', 0]
                  }
                }
              }
            },
          }
        },
        {
          $addFields: {
            courseTitleLower: {
              $toLower: '$courseDetails.title'
            },
            durationText: {
              $cond: [
                { $eq: ['$totalDurationInSec', 0] },
                '0h',
                {
                  $cond: [
                    { $gte: ['$totalDurationInSec', 3600] },
                    {
                      $concat: [
                        {
                          $toString: {
                            $round: [
                              { $divide: ['$totalDurationInSec', 3600] },
                              1
                            ]
                          }
                        },
                        'h'
                      ]
                    },
                    {
                      $concat: [
                        {
                          $toString: {
                            $round: [
                              { $divide: ['$totalDurationInSec', 60] },
                              0
                            ]
                          }
                        },
                        'min'
                      ]
                    }
                  ]
                }
              ]
            }
          }
        }
      ]

      if(dto?.search) {
        searchQuery.push({
          $match:{
            'courseDetails.title':{
              $regex:dto.search,
              $options: 'i'
            }
          }
        })
      }

      let sortStage: any = { createdAt: -1 };

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'coursenameasc':
            sortStage = {courseTitleLower: 1};
            break;
          case 'coursenamedesc':
            sortStage = {courseTitleLower: -1};
            break;
          case 'highestprogress':
            sortStage = {progressPercentage: -1};
            break;
          case 'lowestprogress':
            sortStage = {progressPercentage: 1};
            break;
          case 'mostassessments':
            sortStage = {'total': -1};
            break;
          case 'leastassessments':
            sortStage = {'total': 1};
            break;
          case 'recentlyenrolled':
            sortStage = {createdAt: -1};
            break;
          default:
            sortStage = {createdAt: -1};
        }
      }

      const totalCoursesResult = await this.userCoursesModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalCourses = totalCoursesResult[0]?.total || 0

      const data = await this.userCoursesModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:(dto.page - 1) * dto.limit},
        {$limit: dto.limit},
        {
          $project:{
            courseId: '$courseId',
            courseName: '$courseDetails.title',
            categoryName: '$categoryDetails.name',
            courseCode: '$courseDetails.courseCode',
            modules: { $size: { $ifNull: ['$courseModules', []] } },
            courseImg: {
              $ifNull:['$courseDetails.courseImg', null]
            },
            coverImg: {
              $ifNull:['$courseDetails.coverImg', null]
            },
            firstName: '$tutorDetails.firstName',
            lastName: '$tutorDetails.lastName',
            enrolledOn: '$createdAt',
            total: 1,
            submitted: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentAssessments', []] },
                  as: 's',
                  cond: {
                    $and: [
                      { $eq: ['$$s.studentId', new Types.ObjectId(studentId)] },
                      { $eq: ['$$s.submissionStatus', StudentAssessmentStatus.SUBMITTED] },
                      // { $eq: ['$$s.isGraded', false] }
                    ]
                  }
                }
              }
            },
            notReviewed: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentSubmissions', []] },
                  as: 's',
                  cond: {
                    $and: [
                      { $eq: ['$$s.studentId', new Types.ObjectId(studentId)] },
                      { $eq: ['$$s.submissionStatus', StudentSubmissionStatus.SUBMITTED] },
                      { $eq: ['$$s.isGraded', false] }
                    ]
                  }
                }
              }
            },
            reviewed: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentSubmissions', []] },
                  as: 's',
                  cond: {
                    $and: [
                      { $eq: ['$$s.studentId', new Types.ObjectId(studentId)] },
                      { $eq: ['$$s.submissionStatus', StudentSubmissionStatus.SUBMITTED] },
                      { $eq: ['$$s.isGraded', true] },
                      // {$eq: ['$$s.gradedBy', new Types.ObjectId(userId)]}
                    ]
                  }
                }
              }
            },
            pending: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentAssessments', []] },
                  as: 'a',
                  cond: {
                    $and:[
                      { $eq: ['$$a.studentId', new Types.ObjectId(studentId)] },
                      // {$eq: ['$$a.submissionStatus', StudentAssessmentStatus.PENDING]}
                      {
                        $in: [
                          '$$a.submissionStatus',
                          [
                            StudentAssessmentStatus.PENDING,
                            StudentAssessmentStatus.IN_PROGRESS
                          ]
                        ]
                      }
                    ]
                  }
                }
              }
            },
            expired: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$studentAssessments', []] },
                  as: 'a',
                  cond: {
                    $and:[
                      { $eq: ['$$a.studentId', new Types.ObjectId(studentId)] },
                      {$eq: ['$$a.submissionStatus', StudentAssessmentStatus.EXPIRED]}
                    ]
                  }
                }
              }
            },
            progressPercentage: 1,
            duration:'$durationText'
          }
        }
      ])

      return {data: {
        data,
        totalPages: Math.ceil(totalCourses/dto.limit),
        totalCourses,
        currentPage: dto.page,
      }, err: null}
    }catch(error) {
      console.error(error)
      return {data:null, err: error}
    }
  }

  async formatLearningTime(seconds: number) {
    if (!seconds || seconds <= 0) {
      return "0 min";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }

    return `${minutes} min`;
  }

  async getCourseDetails(courseId: string, studentId: string, userId: string) {
    try{
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const userCourse = await this.userCoursesModel.findOne({
        userId: new Types.ObjectId(studentId),
        courseId: new Types.ObjectId(courseId)
      }).populate({
        path:'courseId',
        populate:{
          path:'categoryId'
        }
      })

      if(!userCourse) {
        return {data: null, err: 'User not enrolled into course.'}
      }

      const course = userCourse?.courseId as any
      const category = (userCourse?.courseId as any).categoryId

      const tutor = await this.userModel.findById(course.createdBy).select('firstName lastName')

      const [totalAssessments, pendingSubmissions] = await Promise.all([
        await this.studentAssessmentModel.countDocuments({
          studentId: new Types.ObjectId(studentId),
          courseId: new Types.ObjectId(courseId),
          // createdBy: new Types.ObjectId(userId)
          ...(!isSuperAdmin && {
            createdBy: new Types.ObjectId(userId)
          })
        }),
        await this.studentAssessmentModel.countDocuments({
          studentId: new Types.ObjectId(studentId),
          courseId: new Types.ObjectId(courseId),
          submissionStatus: { $in: [
            StudentAssessmentStatus.PENDING,
            StudentAssessmentStatus.IN_PROGRESS,
          ]},
          // createdBy: new Types.ObjectId(userId)
          ...(!isSuperAdmin && {
            createdBy: new Types.ObjectId(userId)
          })
        }),
      ])

      const assessmentIds = await this.studentAssessmentModel.find({
        studentId: new Types.ObjectId(studentId),
        courseId: new Types.ObjectId(courseId)
      }).select('_id')

      const studentAssessmentIds = assessmentIds.map(a => a._id);
      
      const pendingReview = await this.studentSubmissionModel.countDocuments({
        studentAssessmentId:{$in:studentAssessmentIds},
        submissionStatus: StudentSubmissionStatus.SUBMITTED,
        studentId: new Types.ObjectId(studentId),
        isGraded: false,
        ...(!isSuperAdmin && {
          assignedBy: new Types.ObjectId(userId)
        })
      })


      const submitted = await this.studentAssessmentModel.countDocuments({
        studentId: new Types.ObjectId(studentId),
        courseId: new Types.ObjectId(courseId),
        submissionStatus: StudentSubmissionStatus.SUBMITTED,
        // createdBy: new Types.ObjectId(userId)
        ...(!isSuperAdmin && {
          createdBy: new Types.ObjectId(userId)
        })
      })

      const submissions = await this.studentAssessmentModel.find({
        ...(isSuperAdmin ? {} : {createdBy:new Types.ObjectId(userId)}),
        studentId: new Types.ObjectId(studentId),
        courseId: new Types.ObjectId(courseId)
      })
      .populate({
        path:'assessmentId',
        select:'title assessmentType'
      })
      .select('assessmentId submissionStatus createdAt')
      .sort({createdAt: -1})
      .limit(3)

      const recentSubmissions = await Promise.all(
        submissions.map( async (s) => {
          const submission = await this.studentSubmissionModel.findOne({
            studentAssessmentId: s._id
          }).sort({attemptNumber: -1})
          return {
            ...s.toObject(),
            isGraded: submission?.isGraded || false,
          }
        })
      )

      const data = {
        category:category.name,
        courseName: course.title,
        courseCode: course.courseCode,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        enrolledOn: userCourse.createdAt,
        progressPercentage: userCourse.progressPercentage,
        totalAssessments,
        submitted,
        pendingSubmissions,
        pendingReview,
        recentSubmissions,
        learningTime: await this.formatLearningTime(course.learningTimeSeconds),
        description: course?.description || '',
      }

      return {data: data, err: null}

    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getCourseAssessments(dto: StudentTabDto, userId: string) {
    try{
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const course = await this.userCoursesModel.findOne({
        userId: new Types.ObjectId(dto.studentId),
        courseId: new Types.ObjectId(dto.courseId)
      })
      .populate({
        path:'courseId',
        populate:{
          path:'categoryId'
        }
      })

      if(!course) {
        return {data: null, err: 'Course not found.'}
      }

      const [totalAssessments, pendingSubmissions] = await Promise.all([
        await this.studentAssessmentModel.countDocuments({
          studentId: new Types.ObjectId(dto.studentId),
          courseId: new Types.ObjectId(dto.courseId)  
        }),
        await this.studentAssessmentModel.countDocuments({
          studentId: new Types.ObjectId(dto.studentId),
          courseId: new Types.ObjectId(dto.courseId),
          submissionStatus: { $in: [
            StudentAssessmentStatus.PENDING,
            StudentAssessmentStatus.IN_PROGRESS,
          ] },
        }),
      ])

      const assessmentIds = await this.studentAssessmentModel.find({
        studentId: new Types.ObjectId(dto.studentId),
        courseId: new Types.ObjectId(dto.courseId)
      }).select('_id')

      const studentAssessmentIds = assessmentIds.map(a => a._id);

      const [submitted, reviewed] = await Promise.all([
        this.studentAssessmentModel.countDocuments({
          studentId: new Types.ObjectId(dto.studentId),
          courseId: new Types.ObjectId(dto.courseId),
          submissionStatus: StudentSubmissionStatus.SUBMITTED,
          // createdBy: new Types.ObjectId(userId)
        }),
        // this.studentSubmissionModel.countDocuments({
        //   studentId: new Types.ObjectId(dto.studentId),
        //   studentAssessmentId: {$in : studentAssessmentIds},
        //   submissionStatus: StudentSubmissionStatus.SUBMITTED,
        //   isGraded: true,
        //   // gradedBy: new Types.ObjectId(userId)
        // }),
        this.studentSubmissionModel.aggregate([
          {
            $match: {
              studentId: new Types.ObjectId(dto.studentId),
              studentAssessmentId: {
                $in: studentAssessmentIds
              },
              submissionStatus: StudentSubmissionStatus.SUBMITTED,
            }
          },
          {
            $sort: {
              attemptNumber: -1
            }
          },
          {
            $group: {
              _id: '$studentAssessmentId',
              latestSubmission: {
                $first: '$$ROOT'
              }
            }
          },
          {
            $match: {
              'latestSubmission.isGraded': true
            }
          },
          {
            $count: 'total'
          }
        ])
      ])

      const searchQuery: any[] = [
        ...(isSuperAdmin ? [] : [{$match:{createdBy: new Types.ObjectId(userId)}}]),
        {
          $match:{
            studentId: new Types.ObjectId(dto.studentId),
            courseId: new Types.ObjectId(dto.courseId),
            // submissionStatus: {$ne:'expired'}
          }
        },
        // {
        //   $lookup:{
        //     from:'studentsubmissions',
        //     localField:'_id',
        //     foreignField:'studentAssessmentId',
        //     as:'studentSubmissions'
        //   }
        // },
        // {
        //   $unwind:'$studentSubmissions'
        // },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: { assessmentId: '$_id', studentId: '$studentId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$studentAssessmentId', '$$assessmentId'] },
                      { $eq: ['$studentId', '$$studentId'] }
                    ]
                  }
                }
              },
              {
                $sort: {
                  attemptNumber: -1,
                  createdAt: -1
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'studentSubmissions'
          }
        },
        {
          $unwind: {
            path: '$studentSubmissions',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from:'courseassessments',
            localField:'assessmentId',
            foreignField:'_id',
            as:'assessmentDetails'
          }
        },
        {
          $unwind:'$assessmentDetails'
        },
        {
          $addFields: {
            assessmentTitleLower: {
              $toLower: '$assessmentDetails.title'
            }
          }
        }
      ]

      if(dto?.search) {
        searchQuery.push({
          $match:{
            'assessmentDetails.title':{
              $regex:dto.search,
              $options: 'i'
            }
          }
        })
      }

      if(dto?.assessmentType) {
        searchQuery.push({
          $match:{
            'assessmentDetails.assessmentType':{
              $regex:dto.assessmentType,
              $options: 'i'
            }
          }
        })
      }

      const dueDate = dto?.dueDate || 'all';

      if (dueDate !== 'all') {
        const now = new Date();

        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        let dueDateMatch: any = {};

        switch (dueDate.toLowerCase()) {
          case 'duetoday':
            dueDateMatch = {
              dueDate: {
                $gte: startOfToday,
                $lte: endOfToday,
              },
            };
            break;

          case 'duetomorrow':
            const startOfTomorrow = new Date(startOfToday);
            startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

            const endOfTomorrow = new Date(endOfToday);
            endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

            dueDateMatch = {
              dueDate: {
                $gte: startOfTomorrow,
                $lte: endOfTomorrow,
              },
            };
            break;

          case 'duethisweek':
            const now = new Date();

            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay();

            const diffToMonday = (day === 0 ? -6 : 1 - day);

            startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            dueDateMatch = {
              dueDate: {
                $gte: startOfWeek,
                $lte: endOfWeek,
              },
            };
            break;

          case 'overdue':
            dueDateMatch = {
              dueDate: {
                $lt: startOfToday,
              },
            };
            break;

          case 'upcoming':
            const next7Days = new Date(endOfToday);
            next7Days.setDate(next7Days.getDate() + 7);

            dueDateMatch = {
              dueDate: {
                $gt: endOfToday,
                $lte: next7Days,
              },
            };
            break;

          case 'customrange':
            if(!dto.startDate || !dto.endDate) {
              return {data: null, err:'Start date, end date required for custom range.'}
            }

            if (dto.startDate && dto.endDate) {
              const startDate = new Date(dto.startDate);
              startDate.setHours(0, 0, 0, 0);

              const endDate = new Date(dto.endDate);
              endDate.setHours(23, 59, 59, 999);

              dueDateMatch = {
                dueDate: {
                  $gte: startDate,
                  $lte: endDate,
                },
              };
            }
            break;
        }

        if (Object.keys(dueDateMatch).length) {
          searchQuery.push({
            $match: dueDateMatch,
          });
        }
      }


      let sortStage: any = {dueDate: -1}

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'duedateasc':
            sortStage = {dueDate:1};
            break;
          case 'duedatedesc':
            sortStage = {dueDate: -1};
            break;
          case 'submissiondateasc':
            sortStage = {'studentSubmissions.submittedAt': 1};
            break;
          case 'submissiondatedesc':
            sortStage = {'studentSubmissions.submittedAt': -1};
            break;
          case 'assessmentnameasc':
            sortStage = {assessmentTitleLower: 1};
            break;
          case 'assessmentnamedesc':
            sortStage = {assessmentTitleLower: -1};
            break;
          case 'highestscore':
            sortStage = {'studentSubmissions.totalScore': -1};
            break;
          case 'lowestscore':
            sortStage = {'studentSubmissions.totalScore': 1};
            break;
          default:
            sortStage = {dueDate: -1};
        }
      }

      const totalAssessmentResult = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {$count: 'total'}
      ])

      const totalCount = totalAssessmentResult[0]?.total || 0

      const data = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:((dto?.page || 1) - 1) * (dto?.limit || 10)},
        {$limit: (dto?.limit || 10)},
        {
          $project:{
            title:'$assessmentDetails.title',
            assessmentType: '$assessmentDetails.assessmentType',
            attemptNumber: {
              $ifNull: ['$studentSubmissions.attemptNumber', 0]
            },
            maxAttempts: {
              $ifNull:['$assessmentDetails.instructions.allowedAttempts', 1]
            },
            submissionDate:{
              $ifNull:['$studentSubmissions.submittedAt', null]
            },
            dueDate: 1,
            status: '$submissionStatus',
            isGraded: {
              $ifNull:['$studentSubmissions.isGraded', null],
            },
            score: {
              $ifNull:['$studentSubmissions.totalScore', 0],
            }
          }
        }
      ])

      return {data: {
        courseName: (course.courseId as any).title,
        courseCode: (course.courseId as any).courseCode,
        categoryName: (course.courseId as any).categoryId.name,
        data,
        totalAssessments,
        submitted,
        pendingSubmissions,
        reviewed: reviewed[0]?.total || 0,
        totalPaginationCount:totalCount,
        totalPages: Math.ceil(totalCount/(dto?.limit || 10)),
        currentPage: dto?.page,
      }, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getAssessmentDetails(studentAssessmentId: string, userId: string) {
    try{

      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))
      .populate({
        path:'assessmentId',
        populate:{
          path:'courseId'
        }
      })
      .populate({
        path:'studentId'
      })

      if(!studentAssessment) {
        return {data: null, err:'No assignment found.'}
      }

      const assessment = studentAssessment.assessmentId as any
      const student = studentAssessment.studentId as any
      let data:any = {
        title: assessment.title,
        courseName: (assessment.courseId as any).title,
        courseCode: (assessment.courseId as any).courseCode, 
        assessmentType: assessment.assessmentType,
        dueDate: studentAssessment.dueDate,
        firstName: student.firstName,
        lastName: student.lastName ,
        userCode: student.userCode,
        maxAttempts: assessment.instructions.allowedAttempts || 1
      }

      if(studentAssessment.submissionStatus === 'pending'
        || studentAssessment.submissionStatus === 'in_progress'
        || studentAssessment.submissionStatus === 'expired'
      ) {
        data = {
          ...data,
          attemptNumber: 0,
        }
      }else if(studentAssessment.submissionStatus === 'submitted') {
        const submission = await this.studentSubmissionModel.findOne({studentAssessmentId:new Types.ObjectId(studentAssessmentId)})
        .sort({attemptNumber: -1})

        data = {
          ...data,
          attemptNumber: submission?.attemptNumber || null,
          isGraded: submission?.isGraded || false,
          submittedOn: submission?.submittedAt || null,
          gradedOn: submission?.gradedAt || null
        }

        if(submission?.isGraded) {
          const questions = submission?.questionSnapshot.map((q) => {
            const studentAnswer = submission?.studentAnswers.find((a) => q._id.toString() === a.questionId.toString())

            return {
              questionType: q.questionType,
              awardedGrade: studentAnswer?.score ? getOriginalGradeFromPercentage(studentAnswer?.score, q.gradingMethod) : null,
              normalizedPercentage: studentAnswer?.score || null
            }
          })
          data = {
            ...data,
            score: submission?.totalScore || null,
            feedback: submission?.graderFeedback || '',
            questions,
          }
        }
      }

      return {data: data, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getPendingSubmissions(studentId: string, dto: StudentTabDto, userId: string) {
    try{
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery:any = [
        {
          $match:{
            studentId: new Types.ObjectId(studentId),
            submissionStatus: {
              $in:[
                StudentAssessmentStatus.PENDING,
                StudentAssessmentStatus.IN_PROGRESS
              ]
            }
          }
        },
        ...(!isSuperAdmin
          ? [{
            $match:{
              createdBy: new Types.ObjectId(userId)
            }
          }]
          : []
        ),
        {
          $lookup:{
            from:'courseassessments',
            localField:'assessmentId',
            foreignField:'_id',
            as:'assessmentDetails'
          },
        },
        {
          $unwind:'$assessmentDetails'
        },
        {
          $lookup:{
            from:'courses',
            localField:'courseId',
            foreignField:'_id',
            as:'courseDetails'
          }
        },
        {
          $unwind:'$courseDetails'
        },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: { studentAssessmentId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$studentAssessmentId', '$$studentAssessmentId']
                  }
                }
              },
              {
                $sort: {
                  attemptNumber: -1
                }
              },
              {
                $limit: 1
              }
            ],
            as: 'latestSubmission'
          }
        },
        {
          $unwind: {
            path: '$latestSubmission',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            assessmentTitleLower: {
              $toLower: '$assessmentDetails.title'
            }
          }
        },
        {
          $addFields: {
            courseTitleLower: {
              $toLower: '$courseDetails.title'
            }
          }
        }
      ]

      if(dto?.search) {
        searchQuery.push({
          $match:{
            'assessmentDetails.title':{
              $regex:dto?.search,
              $options:'i'
            }
          }
        })
      }

      if(dto?.assessmentType !== 'all') {
        searchQuery.push({
          $match:{
            'assessmentDetails.assessmentType': {
              $regex:dto.assessmentType,
              $options: 'i'
            }
          }
        })
      }

      if(dto?.courseId !== 'all') {
        searchQuery.push({
          $match: {
            'courseId': new Types.ObjectId(dto.courseId)
          }
        })
      }

      const dueDate = dto?.dueDate || 'all';

      if (dueDate !== 'all') {
        const now = new Date();

        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        let dueDateMatch: any = {};

        switch (dueDate.toLowerCase()) {
          case 'duetoday':
            dueDateMatch = {
              dueDate: {
                $gte: startOfToday,
                $lte: endOfToday,
              },
            };
            break;

          case 'duetomorrow':
            const startOfTomorrow = new Date(startOfToday);
            startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

            const endOfTomorrow = new Date(endOfToday);
            endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

            dueDateMatch = {
              dueDate: {
                $gte: startOfTomorrow,
                $lte: endOfTomorrow,
              },
            };
            break;

          case 'duethisweek':
            const startOfWeek = new Date(now);
            const day = startOfWeek.getDay();

            const diffToMonday = (day === 0 ? -6 : 1 - day);

            startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            dueDateMatch = {
              dueDate: {
                $gte: startOfWeek,
                $lte: endOfWeek,
              },
            };
            break;

          case 'duenextweek':
            const startOfNextWeek = new Date(now);
            const currentDay = startOfNextWeek.getDay();

            const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay;

            startOfNextWeek.setDate(
              startOfNextWeek.getDate() + daysUntilNextMonday,
            );
            startOfNextWeek.setHours(0, 0, 0, 0);

            const endOfNextWeek = new Date(startOfNextWeek);
            endOfNextWeek.setDate(endOfNextWeek.getDate() + 6);
            endOfNextWeek.setHours(23, 59, 59, 999);

            dueDateMatch = {
              dueDate: {
                $gte: startOfNextWeek,
                $lte: endOfNextWeek,
              },
            };
            break;

          case 'customrange':
            if(!dto.startDate || !dto.endDate) {
              return {data: null, err:'Start date, end date required for custom range.'}
            }
            
            if (dto.startDate && dto.endDate) {
              const startDate = new Date(dto.startDate);
              startDate.setHours(0, 0, 0, 0);

              const endDate = new Date(dto.endDate);
              endDate.setHours(23, 59, 59, 999);

              dueDateMatch = {
                dueDate: {
                  $gte: startDate,
                  $lte: endDate,
                },
              };
            }
            break;
        }

        if (Object.keys(dueDateMatch).length) {
          searchQuery.push({
            $match: dueDateMatch,
          });
        }
      }

      let sortStage: any = {dueDate: -1}

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'duedateasc':
            sortStage = {dueDate: 1}
            break;
          case 'duedatedesc':
            sortStage = {dueDate: -1}
            break;
          case 'assessmentnameasc':
            sortStage = {assessmentTitleLower: 1}
            break;
          case 'assessmentnamedesc':
            sortStage = {assessmentTitleLower: -1}
            break;
          case 'coursenameasc':
            sortStage = {courseTitleLower: 1}
            break;
          case 'coursenamedesc':
            sortStage = {courseTitleLower: -1}
            break;
          default:
            sortStage = {dueDate: -1}
        }
      }

      const totalSubmissionsResult = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalPendingSubmissions = totalSubmissionsResult[0]?.total || 0

      const data = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:((dto?.page ||0) - 1) * (dto?.limit || 10)},
        {$limit:(dto?.limit || 10)},
        {
          $project:{
            assessmentType:'$assessmentDetails.assessmentType',
            courseName:'$courseDetails.title',
            courseCode:'$courseDetails.courseCode',
            assessmentName:'$assessmentDetails.title',
            attemptNumber: {
              $cond:[
                {
                  $eq: [
                    '$submissionStatus', StudentAssessmentStatus.IN_PROGRESS
                  ]
                },
                {
                  $ifNull:['$latestSubmission.attemptNumber', 0]
                },
                0
              ]
            },
            maxAttempts: {
              $ifNull:['$assessmentDetails.instructions.allowedAttempts', 1]
            },
            dueDate:'$dueDate'
          }
        }
      ])

      return {data: {
        data: data,
        totalPendingSubmissions,
        totalPages: Math.ceil(totalPendingSubmissions/(dto?.limit || 10)),
        currentPage: dto?.page
      }, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getPendingSubmissionDetails(studentAssessmentId: string, userId: string) {
    try{

      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))
      .populate({
        path:'assessmentId',
        select: 'title assessmentType instructions'
      })
      .populate({
        path:'courseId',
        select:'title courseCode'
      })
      .populate({
        path:'studentId',
        select:'firstName lastName userCode'
      })

      if(!studentAssessment) {
        return {data: null, err:'Student assessment not found.'}
      }

      const assessment = studentAssessment.assessmentId as any
      const course = studentAssessment.courseId as any
      const student = studentAssessment.studentId as any

      let data:any = {
        title: assessment.title,
        courseName: course.title,
        courseCode: course.courseCode,
        assessmentType: assessment.assessmentType,
        dueDate: studentAssessment.dueDate,
        firstName: student.firstName,
        lastName: student.lastName,
        userCode: student.userCode,
        maxAttempts: assessment.instructions.allowedAttempts || 1,
        submissionStatus: studentAssessment.submissionStatus
      }

      if(studentAssessment.submissionStatus === StudentAssessmentStatus.PENDING) {
        data = {
          ...data,
          attemptNumber: 0
        }
      }else if(studentAssessment.submissionStatus === StudentAssessmentStatus.IN_PROGRESS) {
        const submission = await this.studentSubmissionModel.findOne({studentAssessmentId: new Types.ObjectId(studentAssessmentId)})
        .sort({attemptNumber: -1})

        if(submission) {
          data = {
            ...data,
            attemptNumber: submission.attemptNumber
          }
        }
      }
      return {data: data, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async sendReminder(studentAssessmentId: string, userId: string) {
    try{

      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))
      .populate({
        path:'assessmentId',
        select:'title _id'
      })
      .populate({
        path:'studentId',
        select:'email'
      })

      if(!studentAssessment) {
        return {data: null, err:'Student assessment not found.'}
      }

      if(studentAssessment.submissionStatus !== StudentAssessmentStatus.PENDING) {
        return {data: null, err:'Reminder can only be sent for pending assessments.'}
      }

      const courseAssessment: any = studentAssessment.assessmentId;
      const student: any = studentAssessment.studentId
      const message = `Reminder: Your assessment ${courseAssessment.title} is due. Please complete it before the due date.`
      
      let notification = await this.notificationModel.findOne({
        type: NotificationType.ASSESSMENT_REMINDER,
        assessmentId: new Types.ObjectId(courseAssessment._id),
      })
                                            
      if(!notification) {
        const created = await this.notificationService.CreateNewNotification(
          NotificationType.ASSESSMENT_REMINDER,
          undefined,
          undefined,
          undefined,
          courseAssessment._id.toString()
        );
        notification = created.data;
      }
      
      await this.notificationGateway.sendNotificationToUser(
        notification._id.toString(),
        [student._id.toString()],
        message
      );
      // console.log(`Sending reminder to student ${student._id}`);

      // await EmailService.sendReminder(student.email, courseAssessment.title);
      // console.log(`Assessment reminder email sent successfully to: ${student.email}`);
      
      return {data: notification, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getSubmittedAssessments(studentId: string, dto: StudentTabDto, userId: string) {
    try{
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery: any = [
        {
          $match:{
            studentId: new Types.ObjectId(studentId),
            submissionStatus: StudentAssessmentStatus.SUBMITTED,
            // createdBy: new Types.ObjectId(userId)
          }
        },
        ...(!isSuperAdmin
          ? [{
            $match:{
              createdBy: new Types.ObjectId(userId)
            }
          }]
          : []
        ),
        {
          $lookup:{
            from:'studentsubmissions',
            let: {studentAssessmentId: '$_id'},
            pipeline:[
              {
                $match:{
                  $expr: {
                    $eq:['$studentAssessmentId', '$$studentAssessmentId']
                  }
                }
              },
              {
                $sort:{
                  attemptNumber: -1
                }
              },
              {
                $limit: 1
              }
            ],
            as:'submissionDetails'
          }
        },
        {
          $unwind:'$submissionDetails'
        },
        {
          $lookup:{
            from:'courseassessments',
            localField:'assessmentId',
            foreignField:'_id',
            as:'assessmentDetails'
          }
        },
        {
          $unwind:'$assessmentDetails'
        },
        {
          $lookup:{
            from:'courses',
            localField:'courseId',
            foreignField:'_id',
            as:'courseDetails'
          }
        },
        {
          $unwind:'$courseDetails'
        },
        {
          $addFields: {
            assessmentTitleLower: {
              $toLower: '$assessmentDetails.title'
            }
          }
        },
        {
          $addFields: {
            courseTitleLower: {
              $toLower: '$courseDetails.title'
            }
          }
        }
      ]

      if(dto?.search) {
        searchQuery.push({
          $match:{
            'assessmentDetails.title':{
              $regex:dto.search,
              $options:'i'
            }
          }
        })
      }

      if(dto?.courseId !== 'all') {
        searchQuery.push({
          $match:{
            'courseId':new Types.ObjectId(dto.courseId)
          }
        })
      }

      if(dto?.assessmentType !== 'all') {
        searchQuery.push({
          $match:{
            'assessmentDetails.assessmentType':{
              $regex:dto.assessmentType,
              $options:'i'
            }
          }
        })
      }

      let reviewStatus = dto?.reviewStatus || 'all'

      if(reviewStatus.toLowerCase() === 'not reviewed') {
        searchQuery.push({
          $match:{
            'submissionDetails.isGraded': false
          }
        })
      }else if(reviewStatus.toLowerCase() === 'reviewed') {
        searchQuery.push({
          $match:{
            'submissionDetails.isGraded': true
          }
        })
      }

      let sortStage: any = {'submissionDetails.submittedAt': -1}

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'submitteddatedesc':
            sortStage = {'submissionDetails.submittedAt': -1}
            break;
          case 'submitteddateasc':
            sortStage = {'submissionDetails.submittedAt': 1}
            break;
          case 'assessmentnameasc':
            sortStage = {assessmentTitleLower: 1}
            break;
          case 'assessmentnamedesc':
            sortStage = {assessmentTitleLower: -1}
            break;
          case 'coursenameasc':
            sortStage = {courseTitleLower: 1}
            break;
          case 'coursenamedesc':
            sortStage = {courseTitleLower: -1}
            break;
          case 'reviewstatus':
            sortStage = {'submissionDetails.isGraded': 1}
            break;
          case 'attemptnumberasc':
            sortStage = {'submissionDetails.attemptNumber': 1}
            break;  
          case 'attemptnumberdesc':
            sortStage = {'submissionDetails.attemptNumber': -1}
            break;
          default:
            sortStage = {'submissionDetails.submittedAt': -1}
        }
      }

      const totalSubmittedResult = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalSubmitted = totalSubmittedResult[0]?.total || 0

      const data = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:((dto?.page || 1) - 1) * (dto?.limit || 10)},
        {$limit: (dto?.limit || 10)},
        {
          $project:{
            assessmentType:'$assessmentDetails.assessmentType',
            courseName: '$courseDetails.title',
            courseCode: '$courseDetails.courseCode',
            assessmentName: '$assessmentDetails.title',
            attemptNumber: '$submissionDetails.attemptNumber',
            maxAttempts: {
              $ifNull:['$assessmentDetails.instructions.allowedAttempts', 1]
            },
            submittedDate:'$submissionDetails.submittedAt',
            isGraded: '$submissionDetails.isGraded',
            status:{
              $cond:[
                '$submissionDetails.isGraded',
                'Reviewed',
                'Not Reviewed'
              ]
            }
          }
        }
      ])

      return {data: {
        data,
        totalSubmitted,
        totalPages: Math.ceil(totalSubmitted/(dto?.limit || 10)),
        currentPage: dto.page
      }, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getSubmittedDetails(studentAssessmentId:string, userId: string) {
    try{
      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))
      .populate({
        path:'assessmentId',
        select: 'title assessmentType instructions'
      })
      .populate({
        path:'courseId',
        select:'title courseCode'
      })
      .populate({
        path:'studentId',
        select: 'firstName lastName userCode'
      })

      if(!studentAssessment) {
        return {data:null, err:'Student assessment not found.'}
      }

      const submission = await this.studentSubmissionModel.findOne({
        studentAssessmentId: new Types.ObjectId(studentAssessmentId)
      }).sort({attemptNumber:-1})

      if(!submission) {
        return {data:null, err:'Student submission not found.'}
      }

      const assessment:any = studentAssessment.assessmentId
      const course:any = studentAssessment.courseId
      const student:any = studentAssessment.studentId

      let data:any = {
        title: assessment.title,
        courseName: course.title,
        courseCode: course.courseCode,
        assessmentType: assessment.assessmentType,
        firstName: student.firstName,
        lastName: student.lastName,
        userCode: student.userCode,
        isGraded: submission.isGraded,
        attemptNumber: submission.attemptNumber,
        maxAttempts: assessment.instructions.allowedAttempts || 1,
        submittedOn: submission.submittedAt,
        dueDate: studentAssessment.dueDate
      }

      if(submission?.isGraded) {
        const questions = submission?.questionSnapshot.map((q) => {
          const studentAnswer = submission?.studentAnswers.find((a) => q._id.toString() === a.questionId.toString())
          
          return {
            questionType: q.questionType,
            awardedGrade: studentAnswer?.score ? getOriginalGradeFromPercentage(studentAnswer?.score, q.gradingMethod) : null,
            normalizedPercentage: studentAnswer?.score || null
          }
        })
        data = {
          ...data,
          reviewedOn: submission?.gradedAt || null,
          feedback: submission?.graderFeedback || '',
          score: submission?.totalScore || null,
          questions,
        }
      }
      return {data:data, err:null}
    }catch(error) {
      console.error(error)
      return {data:null, err: error}
    }
  }

  async getPendingReviews(studentId: string, dto: StudentTabDto, userId: string) {
    try{
      const searchQuery:any[] = [
        {
          $lookup:{
            from: 'studentassessments',
            localField:'studentAssessmentId',
            foreignField:'_id',
            as:'studentAssessmentDetails'
          }
        },
        {
          $unwind:'$studentAssessmentDetails'
        },
        {
          $match:{
            studentId: new Types.ObjectId(studentId),
            'studentAssessmentDetails.createdBy': new Types.ObjectId(userId),
            submissionStatus: StudentSubmissionStatus.SUBMITTED,
            isGraded: false,
          }
        },
        {
          $lookup:{
            from: 'courseassessments',
            localField:'assessmentId',
            foreignField:'_id',
            as:'assessmentDetails'
          }
        },
        {
          $unwind:'$assessmentDetails'
        },
        {
          $lookup:{
            from: 'courses',
            localField:'assessmentDetails.courseId',
            foreignField:'_id',
            as:'courseDetails'
          }
        },
        {
          $unwind:'$courseDetails'
        },
      ]

      if(dto?.search) {
        searchQuery.push({
          $match:{
            'assessmentDetails.title':{
              $regex:dto.search,
              $options:'i'
            }
          }
        })
      }

      if (dto?.courseId) {
        searchQuery.push({
          $match: {
            'studentAssessmentDetails.courseId': new Types.ObjectId(dto.courseId)
          }
        })
      }

      if(dto?.assessmentType) {
        searchQuery.push({
          $match:{
            assessmentType:dto.assessmentType
          }
        })
      }

      if(dto?.submissionStatus) {
        searchQuery.push({
          $match:{
            submissionStatus:dto.submissionStatus
          }
        })
      }

      const stortStage = dto?.sortBy === 'submitted_date'
        ? {submittedAt: -1} : {submittedAt:-1}

      const totalPendingResult = await this.studentSubmissionModel.aggregate([
        ...searchQuery,
        {
          $count: 'total'
        }
      ])

      const totalPendingReviews = totalPendingResult[0]?.total || 0

      const data = await this.studentSubmissionModel.aggregate([
        ...searchQuery,
        {$sort: stortStage},
        {$skip: (dto.page - 1) * dto.limit},
        {$limit: dto.limit},
        {
          $project:{
            assessmentType: 1,
            courseName: '$courseDetails.title',
            courseCode: '$courseDetails.courseCode',
            assessmentName: '$assessmentDetails.title',
            attemptNumber:1,
            submissionStatus: 1,
            submittedAt:1,
            dueDate: '$studentAssessmentDetails.dueDate',
            isGraded: 1
          }
        }
      ])

      return {
        data: {
          data,
          totalPendingReviews,
          totalPages: Math.ceil(totalPendingReviews/dto.limit),
          currentPage: dto.page
        }, 
      err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getPendingReviewDetails(submissionId: string, userId: string) {
    try{
      const submission = await this.studentSubmissionModel.findById(submissionId)
      .populate('studentId')
      .populate({
        path:'studentAssessmentId',
        populate:[
          {
            path:'courseId'
          },
          {
            path:'assessmentId'
          }
        ]
      })

      if(!submission) {
        return {data: null, err: 'Submission not found.'}
      }

      const user = submission?.studentId as any
      const studentAssessment = submission?.studentAssessmentId as any
      const course = studentAssessment?.courseId as any
      const assessment = studentAssessment?.assessmentId as any

      let timeTaken = ''

      if (submission.startedAt && submission.submittedAt) {
        const diffMs =
          new Date(submission.submittedAt).getTime() -
          new Date(submission.startedAt).getTime()

        const totalSeconds = Math.floor(diffMs / 1000)

        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60

        timeTaken = `${minutes}m ${seconds}s`
      }

      const data = {
        _id: submission._id,
        title:assessment.title || '',
        courseName: course.title || '',
        courseCode: course.courseCode,
        assessmentType: submission.assessmentType,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        userCode: user?.userCode,
        submissionStatus: submission.submissionStatus,
        isGraded: submission.isGraded,
        attemptNumber: submission.attemptNumber,
        maxAttempts: assessment?.instructions?.allowedAttempts || 1,
        submittedOn: submission.submittedAt,
        dueDate: studentAssessment?.dueDate,
        totalQuestions: submission.questionSnapshot.length || 0,
        questionsAttempted: submission.studentAnswers.length || 0,
        timeTaken,
        startedAt: submission.startedAt,
      }

      return {data:data, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getStudentSubmissions(studentId: string, dto: GetStudentsDto, userId: string) {
    try {
      const searchQuery: any[] = [
        {
          $match: {
            assignedBy: new mongoose.Types.ObjectId(userId),
            studentId: new mongoose.Types.ObjectId(studentId),
            submissionStatus: StudentSubmissionStatus.SUBMITTED
          }
        },
        {
          $lookup: {
            from: 'courseassessments',
            localField: 'assessmentId',
            foreignField: '_id',
            as: 'assessmentDetails',
          }
        },
        {
          $unwind: '$assessmentDetails'
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'assessmentDetails.categoryId',
            foreignField: '_id',
            as: 'categoryDetails',
          }
        },
        {
          $unwind: '$categoryDetails'
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'assessmentDetails.courseId',
            foreignField: '_id',
            as: 'courseDetails',
          }
        },
        {
          $unwind: '$courseDetails'
        }
      ]

      if (dto?.search) {
        const searchRegex = new RegExp(dto.search, 'i');

        searchQuery.push({
          $match: {
            $or: [
              { 'assessmentDetails.title': { $regex: searchRegex } },
              { 'categoryDetails.name': { $regex: searchRegex } },
              { 'courseDetails.title': { $regex: searchRegex } },
            ]
          }
        })
      }

      searchQuery.push(
        { $sort: { attemptNumber: -1 } },
        {
          $group: {
            _id: {
              studentId: '$studentId',
              assessmentId: '$assessmentId',
              studentAssessmentId: '$studentAssessmentId'
            },
            submission: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: { newRoot: '$submission' }
        }
      )

      const totalSubmissionsResult = await this.studentSubmissionModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalSubmissions = totalSubmissionsResult[0]?.total || 0;

      const assessments = await this.studentSubmissionModel.aggregate([
        ...searchQuery,
        { $sort: { createdAt: -1 } },
        { $skip: dto.startIndex || 0 },
        { $limit: dto.noOfItems || 10 },
        {
          $project: {
            title: '$assessmentDetails.title',
            category: '$categoryDetails.name',
            course: '$courseDetails.title',
            submittedAt: 1,
            assessmentType: '$assessmentType',
            attemptNumber: 1,
            assessmentStatus: '$assessmentDetails.status',
            submissionStatus: 1,
            isGraded: 1
          }
        }
      ])

      return { data: { data: assessments, totalSubmissions }, err: null }
    } catch (error) {
      return { data: null, err: error }
    }
  }

  async getSubmissionById(submissionId: string, userId: string) {
    try {
      const submission = await this.studentSubmissionModel.findById(submissionId);

      if (!submission) {
        return { data: null, err: 'Submission not found.' };
      }

      let types: { type: string; count: number }[] = [];
      if (submission.assessmentType === 'quiz') {
        const counts: Record<string, number> = {};
        for (const q of submission.questionSnapshot as any[]) {
          const type = q?.questionType;
          counts[type] = (counts[type] || 0) + 1;
        }
        types = Object.keys(counts).map((type) => ({ type, count: counts[type] }));
      }

      const typesResult = {
        assessmentType: submission.assessmentType,
        types,
      };

      const questionMap = new Map();
      for (const ans of submission.studentAnswers || []) {
        questionMap.set(ans.questionId.toString(), ans);
      }

      const mappedQuestions = (submission.questionSnapshot || []).map((q: any) => {
        const studentAnswer = questionMap.get(q._id.toString());

        const percentageScore = studentAnswer?.score ?? 0;

        const originalGrade = getOriginalGrade(percentageScore, q.gradingMethod);
        const isQuizSubjective = [QuestionType.ASSIGNMENT, QuestionType.ESSAY, QuestionType.SHORT_ANSWER].includes(q.questionType)
        const isAssessmentSubjective = [AssessmentType.ASSIGNMENT, AssessmentType.PROJECT].includes(submission.assessmentType)
        return {
          questionId: q._id,
          questionName: q.questionName,
          questionText: q.questionText,
          questionType: q.questionType,
          gradingMethod: q.gradingMethod,
          // studentGradeInPercentage: percentageScore,
          // originalGrade,
          instructions: q.instructions || null,
          studentAnswer: studentAnswer
            ? {
              selectedChoices: q.questionType === QuestionType.MCQ ? studentAnswer.selectedChoices || [] : undefined,
              correctAnswer: q.questionType === QuestionType.TRUE_FALSE ? studentAnswer.correctAnswer : undefined,
              placeholders: q.questionType === QuestionType.FILL_BLANK ? studentAnswer.placeholders || [] : undefined,
              text: (isQuizSubjective || isAssessmentSubjective)
                ? studentAnswer.text || null
                : undefined,
              attachments: (isQuizSubjective || isAssessmentSubjective)
                ? studentAnswer.attachments || [] : undefined,
            }
            : null,
        };
      });

      const studentAssessment = await this.studentAssessmentModel.findById(
        submission.studentAssessmentId,
      );

      let groupName: string | null = null;

      if (studentAssessment?.isFromGroup && studentAssessment?.groupId) {
        const group = await this.groupModel.findById(studentAssessment.groupId);
        groupName = group?.name ?? null;
      }

      const student = await this.userModel.findById(submission.studentId);

      const user = {
        firstName: student?.firstName ?? null,
        lastName: student?.lastName ?? null,
        profileImage: student?.profileImg ?? null,
        groupName,
        isGraded: submission.isGraded,
      };

      return { data: { ...typesResult, questions: mappedQuestions, user }, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async scoreQuestion(submissionId: string, dto: UpdateStudentSubmissionDto, userId: string) {
    try {

      const submission = await this.studentSubmissionModel.findById(submissionId)

      if (!submission) {
        return { data: null, err: 'Submission not found.' }
      }

      const studentAssessment = await this.studentAssessmentModel.findById(submission.studentAssessmentId)

      if (studentAssessment && studentAssessment.createdBy.toString() !== userId) {
        return { data: null, err: 'Unauthorized access.' };
      }
      
      const question = submission.studentAnswers.find((q) => q.questionId.toString() === dto.questionId.toString())

      if (!question) {
        return { data: null, err: 'Question not found in submission.' };
      }

      if (dto.feedback) question.feedback = dto.feedback

      const scorableQuestionTypes = [QuestionType.ASSIGNMENT, QuestionType.ESSAY, QuestionType.SHORT_ANSWER,];
      const scorableAssessmentTypes = [AssessmentType.ASSIGNMENT, AssessmentType.PROJECT]

      const tutorCanScore = scorableQuestionTypes.includes(question.questionType) || scorableAssessmentTypes.includes(submission.assessmentType)

      if (dto?.manualScore) {
        if (!tutorCanScore) {
          return {
            data: null,
            err: 'Score can only be given for assignment, essay, or short_answer questions.'
          };
        }

        question.manualScore = dto.manualScore;
        const questionSnapshot = submission.questionSnapshot.find((q) => q._id.toString() === dto.questionId.toString())
        const questionScore = normalizeScore(dto.manualScore, questionSnapshot.gradingMethod)
        question.score = questionScore;
      }

      await submission.save()

      return { data: submission, err: null }
    } catch (error) {
      return { data: null, err: error }
    }
  }

  async calculateTotalScore(submissionId: string, userId: string) {
    try {
      const submission = await this.studentSubmissionModel.findById(submissionId)

      if (!submission) {
        return { data: null, err: 'Submission not found.' }
      }

      let totalScore = 0;
      let subjectiveScore = 0;
      let totalSubjectiveQuestions = 0;
      let gradedQuestions = 0;

      let totalMarksObtained = 0;
      let totalQuestions = 0;

      let subjectiveMarksObtained = 0;
      let objectiveMarksObtained = 0;

      let totalObjectiveQuestions = 0;

      const isAssessmentSubjective = [AssessmentType.ASSIGNMENT, AssessmentType.PROJECT]
        .includes(submission.assessmentType);

      for (const q of submission.studentAnswers) {
        const score = Number(q.score || 0);
        totalScore += score;
        gradedQuestions++;

        const mark = score / 100;
        totalMarksObtained += mark;
        totalQuestions++;

        const isQuestionSubjective = [QuestionType.ASSIGNMENT, QuestionType.ESSAY, QuestionType.SHORT_ANSWER]
          .includes(q.questionType);

        const OBJECTIVE_TYPES = [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK];

        const isObjective = OBJECTIVE_TYPES.includes(q.questionType);

        if (isQuestionSubjective || isAssessmentSubjective) {
          subjectiveScore += score;
          totalSubjectiveQuestions++;
          subjectiveMarksObtained += mark;
        }

        if (isObjective && !isAssessmentSubjective) {
          totalObjectiveQuestions++;
          objectiveMarksObtained += mark;
        }
      }

      const finalScore = gradedQuestions ? Number((totalScore / gradedQuestions).toFixed(2)) : 0;

      submission.totalScore = finalScore;

      // Extract grading method from the first question's snapshot or default to percentage
      const firstQuestion = (submission.questionSnapshot && submission.questionSnapshot[0]) || 
                            (submission.studentAnswers && submission.studentAnswers[0]);
      const gradingMethod = firstQuestion?.gradingMethod || 'percentage';
      submission.grade = getOriginalGradeFromPercentage(finalScore, gradingMethod);

      submission.subjectiveScore = totalSubjectiveQuestions
        ? subjectiveScore / totalSubjectiveQuestions
        : 0;;

      submission.totalMarksObtained = Number(totalMarksObtained.toFixed(2));
      submission.totalMarks = totalQuestions;

      submission.subjectiveMarksObtained = Number(subjectiveMarksObtained.toFixed(2));
      submission.totalSubjectiveMarks = totalSubjectiveQuestions;

      submission.objectiveMarksObtained = Number(objectiveMarksObtained.toFixed(2));
      submission.totalObjectiveMarks = totalObjectiveQuestions;

      submission.submissionStatus = StudentSubmissionStatus.SUBMITTED
      submission.gradedAt = new Date();
      submission.isGraded = true
      
      const studentAssessment = await this.studentAssessmentModel.findById(submission.studentAssessmentId);
      submission.gradedBy = studentAssessment.createdBy.toString()//userId

      if (studentAssessment) {
        studentAssessment.submissionStatus = StudentAssessmentStatus.SUBMITTED;
        await studentAssessment.save();
      }
      // console.log('total', totalScore)
      // console.log('finalScore', finalScore)
      // console.log('subjectiveScore', subjectiveScore);
      await submission.save()

      const courseAssessment = await this.courseAssessmentModel.findById(submission.assessmentId)

      if(courseAssessment && courseAssessment.instructions.notifyStudentOnGrading === true) {
        let notification = await this.notificationModel.findOne({
          type: NotificationType.ASSESSMENT_GRADED,
          assessmentId: new Types.ObjectId(submission.assessmentId),
        })

        if(!notification) {
          const created = await this.notificationService.CreateNewNotification(
            NotificationType.ASSESSMENT_GRADED,
            undefined,
            undefined,
            undefined,
            submission.assessmentId.toString()
          );
          
          notification = created.data;
        }
                
        const assessment = await this.courseAssessmentModel.findById(new Types.ObjectId(submission.assessmentId))

        const message = `Your assessment ${assessment.title} has been graded. View your results and feedback.`;

        await this.notificationGateway.sendNotificationToUser(
          notification._id.toString(),
          [submission.studentId],
          message
        );
      }
      return { data: submission, err: null }
    } catch (error) {
      return { data: null, err: error }
    }
  }

  async viewSubmission(submissionId: string, userId: string) {
    try {
      // const submission = await this.studentSubmissionModel.findById(submissionId)
      // .select('-studentAnswers -questionSnapshot')
      const submission = await this.studentSubmissionModel
        .findById(submissionId)
        .select('-studentAnswers')
        .populate({
          path: 'gradedBy',
          select: 'firstName lastName'
        });

      const assessment = await this.courseAssessmentModel.findById(submission.assessmentId).select('instructions.allowedAttempts instructions.hideGraderIdentity')

      if (!submission) {
        return { data: null, err: 'Submission not found.' }
      }

      if (submission.studentId.toString() !== userId) {
        return { data: null, err: 'Unauthorized access.' };
      }

      const OBJECTIVE_TYPES = [QuestionType.MCQ, QuestionType.TRUE_FALSE, QuestionType.FILL_BLANK];

      const isOnlyObjective =
        submission.assessmentType === AssessmentType.QUIZ &&
        submission.questionSnapshot.every((q: any) =>
          OBJECTIVE_TYPES.includes(q.questionType)
        );


      let data = {...submission.toObject(), 
        allowedAttempts: assessment.instructions.allowedAttempts,
        hideGraderIdentity: assessment.instructions.hideGraderIdentity,
        isOnlyObjective
      }
      return {data: data, err: null}
    } catch (error) {
      return { data: null, err: error }
    }
  }

  async getGradeBook(dto: GetStudentsDto, userId: string) {
    try {
      const searchQuery: any = [
        {
          $match: {
            submissionStatus: StudentSubmissionStatus.SUBMITTED,
            isGraded: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        { $unwind: '$userDetails' },
        {
          $lookup: {
            from: 'courseassessments',
            localField: 'assessmentId',
            foreignField: '_id',
            as: 'assessmentDetails'
          }
        },
        { $unwind: '$assessmentDetails' },
        {
          $lookup: {
            from: 'courses',
            localField: 'assessmentDetails.courseId',
            foreignField: '_id',
            as: 'courseDetails'
          }
        },
        { $unwind: '$courseDetails' }
      ]

      if (dto?.search) {
        searchQuery.push({
          $match: {
            $or: [
              {
                'userDetails.firstName': {
                  $regex: dto.search,
                  $options: 'i',
                },
              },
              {
                'userDetails.lastName': {
                  $regex: dto.search,
                  $options: 'i',
                },
              },
              {
                'userDetails.userCode': {
                  $regex: dto.search,
                  $options: 'i',
                },
              },
              {
                'userDetails.email': {
                  $regex: dto.search,
                  $options: 'i',
                }
              },
              {
                $expr: {
                  $regexMatch: {
                    input: {
                      $concat: [
                        '$userDetails.firstName',
                        ' ',
                        '$userDetails.lastName',
                      ],
                    },
                    regex: dto.search,
                    options: 'i',
                  },
                },
              },
            ],
          },
        });
      }

      const totalGraedBookResult = await this.studentSubmissionModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalGradeBooks = totalGraedBookResult[0]?.total || 0;

      const data = await this.studentSubmissionModel.aggregate([
        ...searchQuery,
        { $sort: { createdAt: -1 } },
        { $skip: dto.startIndex || 0 },
        { $limit: dto.noOfItems || 10 },
        {
          $project: {
            userCode: '$userDetails.userCode',
            firstName: {
              $ifNull: ['$userDetails.firstName', null]
            },
            lastName: '$userDetails.lastName',
            email: '$userDetails.email',
            courseName: '$courseDetails.title',
            assessmentName: '$assessmentDetails.title',
            percentage: '$totalScore',
            joinedDate: '$userDetails.createdAt',
            status: '$userDetails.status',
            totalMarksObtained:'$totalMarksObtained',
            totalMarks: '$totalMarks'
          }
        }
      ])
      return { data: { data, totalGradeBooks } as any, err: null }
    } catch (error) {
      console.error(error)
      return { data: null, err: error }
    }
  }

  async getStudentSubmissionQuestions(studentAssessmentId: string, userId: string) {
    try{
      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))
      .populate('courseId')
      .populate('assessmentId')
      .populate('studentId')
      .populate('createdBy')

      if(!studentAssessment) {
        return {data: null, err:'Student assessment not found.'}
      }

      const submission = await this.studentSubmissionModel.findOne({studentAssessmentId: new Types.ObjectId(studentAssessmentId)})
      .sort({attemptNumber: -1})

      if(!submission) {
        return {data: null, err:'Submission not found.'}
      }

      const answers = submission.studentAnswers || []

      const answersMap = new Map(
        answers.map(answer => [answer?.questionId?.toString(), answer])
      )

      const course = studentAssessment.courseId as any
      const assessment = studentAssessment.assessmentId as any
      const student = studentAssessment.studentId as any
      const tutor = studentAssessment.createdBy as any

      let autograded = 0;
      let manualReview = 0;
      let reviewed = 0;

      const autoTypes = ['mcq', 'true_false', 'fill_blank'];

      for (const q of submission.questionSnapshot || []) {
        const studentAnswer = answersMap.get(q._id.toString());

        const hasScore = studentAnswer?.score != null;

        if (autoTypes.includes(q.questionType)) {
          if (hasScore) {
            autograded++;
            reviewed++;
          }
        }
        else {
          manualReview++;
          if (hasScore) {
            reviewed++;
          }
        }
      }

      let data: any = {
        assessmentName: assessment.title,
        courseName: course.title,
        courseCode: course.courseCode,
        assessmentType: assessment.assessmentType,
        firstName: student.firstName,
        lastName: student.lastName,
        userCode: student.userCode,
        attemptNumber: submission.attemptNumber,
        maxAttempts: assessment.instructions.allowedAttempts || 1,
        submittedOn: submission.submittedAt,
        tutorFirstName: tutor.firstName,
        tutorLastName: tutor.lastName,
        totalQuestions: submission.questionSnapshot.length,
        autograded,
        manualReview,
        reviewed,
        feedback: submission.graderFeedback || '',
        score: submission?.totalScore || submission?.objectiveScore ||submission?.subjectiveScore || null
      }

      const questions = (submission.questionSnapshot || []).map((q) => {
        const studentAnswer = answersMap.get(q?._id.toString())

        let correctAnswers:any = null
        let status = 'Pending Review'

        if(q.questionType === 'mcq') {
          correctAnswers = q?.answers?.filter((c) => c.isAnswer == true)
          .map((c) => c.choice)

          const selected = studentAnswer?.selectedChoices || [];

          const isCorrect =
            selected.length === correctAnswers.length &&
            selected.every((val: string) => correctAnswers.includes(val));

          status = isCorrect ? 'Correct' : 'Incorrect';
        } else if(q.questionType === 'true_false') {
          correctAnswers = q?.answers[0]?.correctAnswer

          const isCorrect = studentAnswer?.correctAnswer === correctAnswers;

          status = isCorrect ? 'Correct' : 'Incorrect';
        } else if(q.questionType === 'fill_blank') {
          correctAnswers =
            q.answers?.[0]?.placeholders?.map((p: any) =>
              p.choices
            ) || [];

          const studentPlaceholders = studentAnswer?.placeholders || [];

          const isCorrect =
            studentPlaceholders.length === q.answers?.[0]?.placeholders?.length &&
            studentPlaceholders.every((p: any, i: number) =>
              p.choices?.[0]?.toLowerCase() ===
              q.answers?.[0]?.placeholders?.[i]?.choices?.[0]?.toLowerCase()
            );

          status = isCorrect ? 'Correct' : 'Incorrect';
        }
        else {
          if (studentAnswer?.score !== undefined && studentAnswer?.score !== null) {
            status = 'Graded';
          } else {
            status = 'Pending Review';
          }
        }

        let questionGrade = null
        
        if(assessment.assessmentType === 'quiz') {
          questionGrade = (() => {
            if (q.questionType === 'mcq') {
              return q?.answers?.filter((c) => c.isAnswer).map((c) => c.grade)
            }
            if (q.questionType === 'true_false') {
              return q.answers?.[0]?.grade || null;
            }
            if (q.questionType === 'fill_blank') {
              return q.answers?.[0]?.placeholders[0]?.grade || null 
            }
            if (q.questionType === 'short_answer') {
              return q.answers?.grade || null 
            }

            return q.answers?.[0]?.grade || null;
          })();
        }else if(assessment.assessmentType === 'assignment' ||
          assessment.assessmentType === 'project'
        ) {
          questionGrade = q.grade
        }
        
        return {
          questionId: q._id,
          questionType: q.questionType || '',
          gradingMethod: q.gradingMethod,
          isAutoGraded: autoTypes.includes(q.questionType) ? true : false,
          isGraded:['mcq', 'true_false', 'fill_blank'].includes(q.questionType)
            ? studentAnswer?.score != null
            : (studentAnswer?.score ?? 0) > 0,
          questionName: q.questionName || '',
          questionText: q.questionText || '',
          attachments: q.attachments || q.additionalFiles || [],
          answers: q.answers || [],
          // correctAnswers,
          studentAnswer,
          normalizedPercentage: studentAnswer?.score || null,
          status,
          questionGrade,
          minWords: q.minWords || null,
          maxWords: q.maxWords || null,
          // acheivedGrade: studentAnswer?.score ? getOriginalGradeFromPercentage(studentAnswer.score, q.gradingMethod) : null,
          acheivedGrade: studentAnswer?.score
            ? (
                q.gradingMethod === 'rubric'
                  ? getOriginalGradeFromPercentage(studentAnswer.score, q.gradingMethod)
                      ?.charAt(0)
                      .toUpperCase() +
                    getOriginalGradeFromPercentage(studentAnswer.score, q.gradingMethod)
                      ?.slice(1)
                  : getOriginalGradeFromPercentage(studentAnswer.score, q.gradingMethod)
              )
            : null,
        }
      })

      data = {
        ...data,
        questions
      }

      return {data:data, err:null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async scoreAssessment(studentAssessmentId: string, dto: UpdateScoreDto, userId: string) {
    try{
      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))

      if(!studentAssessment) {
        return {data: null, err:'Student assessment not found.'}
      }

      const submission = await this.studentSubmissionModel.findOne({studentAssessmentId: new Types.ObjectId(studentAssessmentId)})
      .sort({attemptNumber: -1})

      if(!submission) {
        return {data: null, err: 'Student submission not found.'}
      }

      // if(submission.isGraded) {
      //   return {data:null, err:'Submission already graded.'}
      // }

      for(const payloadQuestion  of dto.questions) {
        const studentAnswer = submission.studentAnswers.find((a) => a.questionId.toString() === payloadQuestion.questionId.toString())
        const question = submission.questionSnapshot.find((q) => q._id.toString() === payloadQuestion.questionId.toString())
        
        if (!studentAnswer || !question) {
          continue;
        }

        if(submission.assessmentType === 'quiz') {
          if(['mcq', 'fill_blank', 'true_false'].includes(question.questionType)) continue
        }

        studentAnswer.score = normalizeScore(payloadQuestion.score, question.gradingMethod)
      }

      if(dto?.feedback) {
        submission.graderFeedback = dto.feedback
      }
      await submission.save()

      await this.calculateTotalScore(submission._id.toString(), userId)

      return {data: 'Graded successfully.', err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async getGradebookCourses(dto: GetGradebookDto, userId: string) {
    try {
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery: any = [
        ...(isSuperAdmin ? [] : [{$match:{createdBy: new Types.ObjectId(userId)}}]),
        // {
        //   $lookup: {
        //     from: 'studentassessments',
        //     localField: '_id',
        //     foreignField: 'courseId',
        //     as: 'assessments'
        //   }
        // },
        {
          $lookup: {
            from: 'studentassessments',
            let: {
              courseId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$courseId', '$$courseId'] },
                      ...(!isSuperAdmin
                        ? [{ $eq: ['$createdBy', new Types.ObjectId(userId)] }]
                        : [])
                    ]
                  }
                }
              }
            ],
            as: 'assessments'
          }
        },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: {
              assessmentIds: '$assessments._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: [
                      '$studentAssessmentId',
                      '$$assessmentIds'
                    ]
                  },
                  isGraded: true
                }
              }
            ],
            as: 'gradedSubmissions'
          }
        },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: { assessments: '$assessments._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $in: [
                          '$studentAssessmentId',
                          '$$assessments'
                        ]
                      },
                      {
                        $eq: ['$submissionStatus', StudentSubmissionStatus.SUBMITTED]
                      },
                      {
                        $eq: ['$isGraded', false]
                      }
                    ]
                  }
                }
              }
            ],
            as: 'pendingSubmissions'
          }
        },
        {
          $lookup: {
            from: 'usercourses',
            localField: '_id',
            foreignField: 'courseId',
            as: 'userCourses'
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'categoryDetails'
          }
        },
        { $unwind: '$categoryDetails' },
        {
          $addFields: {
            totalLearners: { $size: { $ifNull: ['$userCourses', []] } },

            needsTObeGraded: {
              $size: { $ifNull: ['$pendingSubmissions', []] }
            },
            classAverage: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $ifNull: ['$gradedSubmissions', []]
                      }
                    },
                    0
                  ]
                },
                {
                  $round: [
                    {
                      $divide: [
                        {
                          $sum: '$gradedSubmissions.totalScore'
                        },
                        {
                          $size: '$gradedSubmissions'
                        }
                      ]
                    },
                    2
                  ]
                },
                0
              ]
            },
            totalAssessments: {
              $size: { $ifNull: ['$assessments', []] }
            },
            titleLower: { $toLower: "$title" },
            statusRank: {
              $cond: [
                { $eq: ["$status", "ACTIVE"] },
                1,
                0
              ]
            }
          }
        },
        {
          $match: {
            totalLearners: { $gt: 0 }
          }
        }
      ];

      if(dto?.search) {
        searchQuery.push({
          $match:{
            $or:[
              {
                title:{
                  $regex:dto.search,
                  $options:'i'
                }
              },
              {
                courseCode:{
                  $regex:dto.search,
                  $options:'i'
                }
              }
            ]
          }
        })
      }

      if(dto?.categoryId !== 'all') {
        searchQuery.push({
          $match:{
            'categoryDetails._id': new Types.ObjectId(dto.categoryId)
          }
        })
      }

      if(dto?.status !== 'all') {
        searchQuery.push({
          $match:{
            status: {
              $regex:dto.status,
              $options: 'i'
            }
          }
        })
      }

      let sortStage:any= { statusRank:-1, createdAt: -1}

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'allactive':
            sortStage={statusRank:-1, createdAt: -1}
            break;
          case 'recentlyupdated':
            sortStage={updatedAt:-1}
            break;
          case 'coursenameasc':
            sortStage={titleLower:1}
            break;
          case 'coursenamedesc':
            sortStage={titleLower:-1}
            break;
          case 'mostlearners':
            sortStage={'totalLearners':-1}
            break;
          case 'leastlearners':
            sortStage={'totalLearners':1}
            break;
          case 'mostpendingreviews':
            sortStage={needsTObeGraded:-1}
            break;
          case 'leastpendingreviews':
            sortStage={needsTObeGraded: 1}
        }
      }

      // const totalCoursesResult = await this.courseModel.aggregate([
      //   ...searchQuery,
      //   { $count: 'total' }
      // ]);

      // const totalCourses = totalCoursesResult[0]?.total || 0;

      const data = await this.courseModel.aggregate([
        ...searchQuery,
        {
          $facet:{
            metadata:[
              {
                $count:'total'
              }
            ],
            data: [
              { $sort: sortStage },
              {$skip: ((dto?.page || 1) - 1) * (dto?.limit || 10)},
              { $limit: dto?.limit || 10 },
              {
                $project: {
                  _id: 1,
                  courseName: '$title',
                  courseCode: 1,
                  coverImg: 1,
                  courseImg: 1,
                  status: 1,
                  categoryName: '$categoryDetails.name',
                  totalLearners: 1,
                  needsTObeGraded: 1,
                  classAverage: 1
                }
              }
            ]
          }
        }
      ]);

      const totalCourses = data[0]?.metadata?.[0]?.total || 0;

      return {
        data: {
          data: data[0]?.data ,
          totalCourses,
          totalPages: Math.ceil(totalCourses / (dto?.limit || 10)),
          currentPage: dto?.page || 1
        }
      };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async getGradebookDetails(dto: GetGradebookDto, userId: string) {
    try {
      const user = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(user && ((user.roleId as any).roleName === 'admin' ||(user.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      if (!Types.ObjectId.isValid(dto.courseId)) {
        return {
          data: null,
          err: 'Invalid course id.',
        };
      }

      const courseId = new Types.ObjectId(dto.courseId);

      const assessmentFilter: any = {
        courseId,
      };

      if (dto.assessmentType && dto.assessmentType !== 'all') {
        assessmentFilter.assessmentType = dto.assessmentType;
      }

      const courseDetails = await this.courseModel.findById(courseId)
      .populate('categoryId')

      if(!courseDetails) {
        return {data:null, err:"Course not found."}
      }

      const learners = await this.userCoursesModel.countDocuments({courseId: new Types.ObjectId(courseId)})

      const modules = await this.courseModule.countDocuments({courseId: new Types.ObjectId(courseId)})

      const courseAssessments = await this.courseAssessmentModel.find(assessmentFilter)
      .sort({ createdAt: 1 })
      .lean();

      const assessmentIds = courseAssessments.map((assessment) => assessment._id);

      const studentAssessments = await this.studentAssessmentModel.find({
        ...(isSuperAdmin
          ? {}
          : { createdBy: new Types.ObjectId(userId) }
        ),
        courseId,
        assessmentId: {
          $in: assessmentIds,
        },
      })
      .populate(
        'studentId',
        'firstName lastName email profileImg userCode',
      )
      .lean();

      const studentAssessmentIds = studentAssessments.map((studentAssessment) => studentAssessment._id);

      const latestSubmissions = await this.studentSubmissionModel.aggregate([
        {
          $match: {
            studentAssessmentId: {
              $in: studentAssessmentIds,
            },
          },
        },
        {
          $sort: {
            studentAssessmentId: 1,
            attemptNumber: -1,
            createdAt: -1,
          },
        },
        {
          $group: {
            _id: '$studentAssessmentId',
            submission: {
              $first: '$$ROOT',
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: '$submission',
          },
        },
      ]);

      const submissionMap = new Map();

      latestSubmissions.forEach(
        (submission) => {
          submissionMap.set(
            submission.studentAssessmentId.toString(),
            submission,
          );
        },
      );

      const studentsMap = new Map();

      for (const studentAssessment of studentAssessments) {
        const student = studentAssessment.studentId as any;

        const studentId = student._id.toString();

        const assessmentId = studentAssessment.assessmentId.toString();
        const studentAssessmentId = studentAssessment._id.toString()

        if (!studentsMap.has(studentId)) {

          const initialScores = courseAssessments.map(
            assessment => ({
              assessmentId:
                assessment._id.toString(),
              score: '',
              status: 'pending',
              studentAssessmentId: null
            }),
          );

          studentsMap.set(studentId, {
            studentId,
            userCode:student.userCode,
            firstName:
              student.firstName || '',
            lastName:
              student.lastName || '',
            // email: student.email || '',
            profileImage:
              student.profileImg || '',
            scores: initialScores,
          });
        }

        const studentData = studentsMap.get(studentId);

        const submission = submissionMap.get(studentAssessment._id.toString());
      
        const scoreIndex = studentData.scores.findIndex(
          score =>
            score.assessmentId === assessmentId,
        );

        let status = 'pending';
        let score = '';

        if(studentAssessment && studentAssessment.submissionStatus === StudentAssessmentStatus.EXPIRED) {
          status = 'expired'
        }

        if (submission) {
          if (submission.isGraded) {
            status = 'graded';
            score = submission.totalScore;
          } else {
            status = 'submitted';
          }
        }

        studentData.scores[scoreIndex] = {
          assessmentId,
          score,
          status,
          studentAssessmentId
        };
      }

      const students = Array.from(
        studentsMap.values(),
      ).map((student: any) => {
        const gradedScores = student.scores.filter(
          (score: any) =>
            score.status === 'graded' &&
            score.score !== '' &&
            score.score !== null,
        );

        const average =
          gradedScores.length > 0
            ? Number(
                (
                  gradedScores.reduce(
                    (sum: number, score: any) =>
                      sum + Number(score.score),
                    0,
                  ) / gradedScores.length
                ).toFixed(2),
              )
            : 0;

        const missingSubmissions = student.scores.filter(
          (score: any) => score.status === 'pending',
        ).length;

        const latestUpdatedAt = Math.max(
          ...student.scores
            .map((score: any) => {
              const submission = submissionMap.get(
                score.studentAssessmentId,
              );

              return submission?.updatedAt
                ? new Date(
                    submission.updatedAt,
                  ).getTime()
                : 0;
            }),
        );

        return {
          ...student,
          average,
          missingSubmissions,
          latestUpdatedAt,
        };
      });

      let filteredStudents = students;

      if (dto?.search) {
        const search = dto.search.toLowerCase();

        filteredStudents = students.filter((student: any) => {
          const firstName = (student.firstName || '').toLowerCase();
          const lastName = (student.lastName || '').toLowerCase();
          const fullName = `${firstName} ${lastName}`.trim();
          const reverseFullName = `${lastName} ${firstName}`.trim();
          const userCode = (student.userCode || '').toLowerCase();

          return (
            userCode.includes(search) ||
            firstName.includes(search) ||
            lastName.includes(search) ||
            fullName.includes(search) ||
            reverseFullName.includes(search)
          );
        });
      }

      let sortedStudents = [...filteredStudents];

      let sortBy = dto?.sortBy || 'studentnameasc'

      switch (sortBy.toLowerCase()) {
        case 'studentnameasc':
          sortedStudents.sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(
              `${b.firstName} ${b.lastName}`,
            ),
          );
          break;

        case 'studentnamedesc':
          sortedStudents.sort((a, b) =>
            `${b.firstName} ${b.lastName}`.localeCompare(
              `${a.firstName} ${a.lastName}`,
            ),
          );
          break;

        case 'studentid':
          sortedStudents.sort((a, b) =>
            a.userCode.localeCompare(
              b.userCode,
            ),
          );
          break;

        case 'averageasc':
        case 'lowestperformingstudents':
          sortedStudents.sort(
            (a, b) => a.average - b.average,
          );
          break;

        case 'averagedesc':
        case 'highestperformingstudents':
          sortedStudents.sort(
            (a, b) => b.average - a.average,
          );
          break;

        case 'mostmissingsubmissions':
          sortedStudents.sort(
            (a, b) =>
              b.missingSubmissions -
              a.missingSubmissions,
          );
          break;

        case 'leastmissingsubmissions':
          sortedStudents.sort(
            (a, b) =>
              a.missingSubmissions -
              b.missingSubmissions,
          );
          break;

        case 'recentyupdated':
          sortedStudents.sort(
            (a, b) =>
              b.latestUpdatedAt -
              a.latestUpdatedAt,
          );
          break;

        default:
          break;
      }

      const classAverages = {};

      for (const assessment of courseAssessments) {
        const assessmentId =
          assessment._id.toString();

        let total = 0;
        let count = 0;

        students.forEach((student: any) => {
          const scoreObj = student.scores.find(
            (score: any) =>
              score.assessmentId === assessmentId,
          );

          if (
            scoreObj &&
            scoreObj.status === 'graded'
          ) {
            total += Number(scoreObj.score);
            count++;
          }
        });

        classAverages[assessmentId] =
          count > 0
            ? Number(
                (total / count).toFixed(2),
              )
            : 0;
      }

      const classAverageValues = Object.values(classAverages).filter(
        (value: any) => value > 0,
      ) as number[];

      const totalClassAverage =
        classAverageValues.length > 0
          ? Number(
              (
                classAverageValues.reduce(
                  (sum, value) => sum + value,
                  0,
                ) / classAverageValues.length
              ).toFixed(2),
            )
          : 0;

      return {
        data: {
          assessments:
            courseAssessments.map(
              (assessment) => ({
                assessmentId:
                  assessment._id,
                title:
                  assessment.title,
                assessmentType:
                  assessment.assessmentType,
              }),
            ),
          students: sortedStudents,
          classAverages,
          courseName: courseDetails.title,
          categoryName: (courseDetails.categoryId as any).name,
          totalClassAverage,
          learners,
          modules
        },
        err: null,
      };
    } catch (error) {
      console.error(error);

      return {
        data: null,
        err: error,
      };
    }
  }

  async getGradebookAssessment(studentAssessmentId:string, userId: string) {
    try{
      if (!Types.ObjectId.isValid(studentAssessmentId)) {
        return {
          data: null,
          err: 'Invalid student assessment id.',
        };
      }

      const studentAssessment = await this.studentAssessmentModel.findById(new Types.ObjectId(studentAssessmentId))
      .populate({
        path:'assessmentId',
        populate:{
          path:'courseId'
        }
      })
      .populate({
        path:'studentId'
      })

      if(!studentAssessment) {
        return {data: null, err:'No assignment found.'}
      }

      const assessment = studentAssessment.assessmentId as any
      const student = studentAssessment.studentId as any
      let data:any = {
        title: assessment.title,
        courseName: (assessment.courseId as any).title,
        courseCode: (assessment.courseId as any).courseCode, 
        assessmentType: assessment.assessmentType,
        dueDate: studentAssessment.dueDate,
        firstName: student.firstName,
        lastName: student.lastName ,
        userCode: student.userCode,
        maxAttempts: assessment.instructions.allowedAttempts || 1
      }

      if(studentAssessment.submissionStatus === StudentAssessmentStatus.PENDING
        || studentAssessment.submissionStatus === StudentAssessmentStatus.IN_PROGRESS
        || studentAssessment.submissionStatus === StudentAssessmentStatus.EXPIRED
      ) {
        data = {
          ...data,
          attemptNumber: 0,
        }
      }else if(studentAssessment.submissionStatus === StudentAssessmentStatus.SUBMITTED) {
        const submission = await this.studentSubmissionModel.findOne({studentAssessmentId:new Types.ObjectId(studentAssessmentId)})
        .sort({attemptNumber: -1})
        
        data = {
          ...data,
          attemptNumber: submission?.attemptNumber || null,
          isGraded: submission?.isGraded || false,
          submittedOn: submission?.submittedAt || null,
          gradedOn: submission?.gradedAt || null
        }

        if(submission?.isGraded) {
          const questions = submission?.questionSnapshot.map((q) => {
            const studentAnswer = submission?.studentAnswers.find((a) => q._id.toString() === a.questionId.toString())

            return {
              questionType: q.questionType,
              awardedGrade: studentAnswer?.score ? getOriginalGradeFromPercentage(studentAnswer?.score, q.gradingMethod) : null,
              normalizedPercentage: studentAnswer?.score || null
            }
          })
          data = {
            ...data,
            score: submission.totalScore || null,
            feedback: submission.graderFeedback || '',
            questions,
          }
        }
      }

      return {data: data, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }
}

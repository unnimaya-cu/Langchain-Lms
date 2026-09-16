import { Injectable } from '@nestjs/common';
import { CreateStudentAssessmentDto } from './dto/create-student-assessment.dto';
import { UpdateStudentAssessmentDto } from './dto/update-student-assessment.dto';
import { InjectModel } from '@nestjs/mongoose';
import { StudentAssessment } from './schema/create-student-assessment.schema';
import mongoose, { Model, Types } from 'mongoose';
import { Group } from '../group/schema/group.schema';
import { GetStudentAssessmentsDto } from './dto/getStudentAssessments.dto';
import { CourseAssessment } from '../course-assessment/schema/course-assessment.schema';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { Notification, NotificationDocument } from '../notification/schema/notification.schema';
import { User } from '../user/schema/user.schema';
import { capitalize } from 'src/utils/capitalizeName';
import { StatusType } from 'src/common/enum/status-type.enum';
import { StudentSubmission } from '../student-submission/schema/student-submission.schema';

@Injectable()
export class StudentAssessmentService {
  constructor(
    @InjectModel(StudentAssessment.name)
    private readonly studentAssessmentModel: Model<StudentAssessment>,
    @InjectModel(Group.name)
    private readonly groupModel: Model<Group>,
    @InjectModel(CourseAssessment.name)
    private readonly courseAssessmentModel: Model<CourseAssessment>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(StudentSubmission.name)
    private readonly studentSubmissionModel: Model<StudentSubmission>
  ) { }

  async create(dto: CreateStudentAssessmentDto, userId: string) {
    try {
      let studentIds: string[] = dto.studentIds || [];

      const groupIds = dto.groupIds?.length
        ? dto.groupIds
        : [];

      const groupStudentMap = new Map<string, string>();

      for (const groupId of groupIds) {
        const group = await this.groupModel.findById(groupId);

        if (!group) continue;

        group.studentIds.forEach((id) => {
          const studentId = id.toString();

          if (!groupStudentMap.has(studentId)) {
            groupStudentMap.set(studentId, groupId);
          }
        });
      }

      if (dto.groupIds?.length) {
        await this.courseAssessmentModel.updateOne(
          { _id: dto.assessmentId },
          {
            $addToSet: {
              groupIds: { $each: dto.groupIds },
            },
          }
        );
      }

      // if (dto.groupId) {
      //   const group = await this.groupModel.findById({ _id: dto.groupId });

      //   if (!group) {
      //     return {data: null, err: 'Group not found.'};
      //   }

      //   studentIds = group.studentIds.map((id) => id.toString());
      // }

      studentIds = [
        ...studentIds,
        ...Array.from(groupStudentMap.keys())
      ];

      studentIds = [...new Set(studentIds)];

      const existingAssignments = await this.studentAssessmentModel.find({
        studentId: { $in: studentIds },
        assessmentId: dto.assessmentId,
      });

      const alreadyAssignedStudentIds = existingAssignments.map(
        (a) => a.studentId.toString()
      );

      const newStudentIds = studentIds.filter(
        (id) => !alreadyAssignedStudentIds.includes(id)
      );

      if (!newStudentIds.length) {
        return { data: [], err: null }
      }

      const assignments = newStudentIds.map((studentId) => ({
        ...dto,
        studentId,
        createdBy: userId,
        groupId: groupStudentMap.get(studentId) || null,
        updatedBy: userId,
      }));

      // delete assignments['studentIds'];

      const result = await this.studentAssessmentModel.insertMany(assignments);

      const courseAssessment = await this.courseAssessmentModel.findById(new Types.ObjectId(dto.assessmentId))

      if(courseAssessment && courseAssessment.instructions.notifyStudentOnAssignment) {
        // let notification = await this.notificationModel.findOne({
        //   type: NotificationType.ASSIGN_ASSESSMENT,
        //   assessmentId: new Types.ObjectId(dto.assessmentId),
        // })

        // if(!notification) {
        //   const created = await this.notificationService.CreateNewNotification(
        //       NotificationType.ASSIGN_ASSESSMENT,
        //       undefined,
        //       undefined,
        //       undefined,
        //       dto.assessmentId.toString()
        //     );
        //     notification = created.data;
        // }

        const notification = await this.notificationModel.findOneAndUpdate(
          {
            type: NotificationType.ASSIGN_ASSESSMENT,
            assessmentId: new Types.ObjectId(dto.assessmentId),
          },
          {
            $setOnInsert: {
              type: NotificationType.ASSIGN_ASSESSMENT,
              assessmentId: new Types.ObjectId(dto.assessmentId),
            },
          },
          {
            new: true,
            upsert: true,
          }
        );

        const assignedUser = await this.userModel.findById(new Types.ObjectId(userId))
          .select('firstName lastName')

        const assessment = await this.courseAssessmentModel.findById(new Types.ObjectId(dto.assessmentId)).select('title')

        const assignedName = `${capitalize(assignedUser.firstName)} ${capitalize(assignedUser.lastName)}`

        const message = `${assignedName} has assigned you an assessment named ${assessment.title}`

        await this.notificationGateway.sendNotificationToUser(
          notification._id.toString(),
          newStudentIds,
          message,
          true
        );
      }

      return { data: result, err: null };
    } catch (error) {
      return { data: null, err: error};
    }
  }

  async getStudentAssessments(dto: GetStudentAssessmentsDto, userId: string) {
    try {

      const searchQuery: any = [
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(userId),
            status: {$ne: StatusType.DELETED}
          }
        },
        {
          $lookup: {
            from: 'courseassessments',
            localField: 'assessmentId',
            foreignField: '_id',
            as: 'courseAssessments'
          }
        },
        {
          $unwind: '$courseAssessments'
        },
        {
          $lookup: {
            from: 'studentsubmissions',
            let: { assessmentId: '$assessmentId', studentId: '$studentId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$assessmentId', '$$assessmentId'] },
                      { $eq: ['$studentId', '$$studentId'] }
                    ]
                  }
                }
              },
              { $sort: { attemptNumber: -1 } },
              { $limit: 1 }
            ],
            as: 'submissions'
          }
        }
      ]

      if (dto?.status && dto.status.toLowerCase() !== 'all') {
        searchQuery.push({
          $match: {
            submissionStatus: { $regex: dto.status, $options: 'i' }
          }
        })
      }

      if (dto?.search) {
        searchQuery.push({
          $match: {
            'courseAssessments.title': { $regex: dto.search, $options: 'i' }
          }
        })
      }

      const totalassessmentsResult = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalAssessments = totalassessmentsResult[0]?.total || 0;

      const data = await this.studentAssessmentModel.aggregate([
        ...searchQuery,
        { $sort: { createdAt: -1 } },
        { $skip: dto.startIndex || 0 },
        { $limit: dto.noOfItems || 10 },
        {
          $project: {
            _id: 1,
            assessmentId: 1,
            title: '$courseAssessments.title',
            dueDate: 1,
            submissionStatus: 1,
            totalScore: {
              $ifNull: [{ $arrayElemAt: ['$submissions.totalScore', 0] }, null]
            },
            grade: {
              $ifNull: [{ $arrayElemAt: ['$submissions.grade', 0] }, null]
            },
            objectiveScore: {
              $ifNull: [{ $arrayElemAt: ['$submissions.objectiveScore', 0] }, null]
            },
            subjectiveScore: {
              $ifNull: [{ $arrayElemAt: ['$submissions.subjectiveScore', 0] }, 0] 
            },
            
            feedback: {
              $ifNull: [{ $arrayElemAt: ['$submissions.graderFeedback', 0] }, null]
            },
            status: 1,
            isGradedByTutor: {
              $ifNull: [{ $arrayElemAt: ['$submissions.isGraded', 0] }, false]
            },
            attemptNumber: {
              $ifNull: [{ $arrayElemAt: ['$submissions.attemptNumber', 0] }, 0]
            },
            submissionId: {
              $ifNull: [{ $arrayElemAt: ['$submissions._id', 0] }, null]
            },
            startedAt: {
              $ifNull: [{ $arrayElemAt: ['$submissions.startedAt', 0] }, null]
            },
            endTime: {
              $ifNull: [{ $arrayElemAt: ['$submissions.endTime', 0] }, null]
            },
            serverNow: {
              $ifNull: [{ $arrayElemAt: ['$submissions.serverNow', 0] }, null]
            },
            enableSubmissionFrom: {
              $ifNull: ['$courseAssessments.instructions.enableSubmissionFrom', false]
            },
            submissionFrom: {
              $ifNull: ['$courseAssessments.instructions.submissionFrom', null]
            },
            formattedSubmissionFrom: {
              $cond: {
                if: { $ne: ['$courseAssessments.instructions.submissionFrom', null] },
                then: {
                  $dateToString: {
                    format: "%Y-%m-%dT%H:%M:%S.%L",
                    date: "$courseAssessments.instructions.submissionFrom"
                  }
                },
                else: null
              }
            },
            formattedDueDate: {
              $cond: {
                if: { $ne: ['$dueDate', null] },
                then: {
                  $dateToString: {
                    format: "%Y-%m-%dT%H:%M:%S.%L",
                    date: "$dueDate"
                  }
                },
                else: null
              }
            },
            duration: 1
          }
        }
      ])
      // return { data: data, err: null };
      return {
        data: {
          assessments: data,
          totalAssessments,
          totalPages: Math.ceil(totalAssessments / dto.noOfItems),
          currentPage: Math.floor((dto.startIndex || 0) / (dto.noOfItems || 10)) + 1,
        },
        err: null,
      };
    } catch (error) {
      return { data: null, err: error };
    }
  }

  async getAssessmentTypes(assessmentId: string, userId: string) {
    try {
      const assessment = await this.courseAssessmentModel.findById(assessmentId);

      if (!assessment) {
        return { data: null, err: 'Assessment not found.' }
      }

      const studentSubmission = await this.studentSubmissionModel.findOne({assessmentId: new Types.ObjectId(assessmentId), studentId: new Types.ObjectId(userId)}).sort({attemptNumber: -1}).limit(1)

      if(!studentSubmission) {
        return { data: null, err: 'No submission found for this assessment.' }
      }

      let types: {type: string, count: number}[] = [];

      if (assessment.assessmentType === 'quiz') {
        const counts: Record<string, number> = {};

        for(const q of studentSubmission.questionSnapshot as any[]) {
          const type = q?.questionType;
          counts[type] = (counts[type] || 0) + 1;
        }

        types = Object.keys(counts).map((type) => ({
          type, count: counts[type]
        }));
      }
      else {
        // types = assessment.questions.map((q: any) => q.instructions)
        types = []
      }

      const typesResult = {
        assessmentType: assessment.assessmentType,
        types
      }

      const questions = studentSubmission.questionSnapshot as any[];

      const studentAssessment = await this.studentAssessmentModel.findOne({ assessmentId, studentId: userId })

      const studentAnswers = await this.studentSubmissionModel.findOne({ assessmentId, studentId: userId }).sort({ attemptNumber: -1 }).limit(1)

      if (studentAnswers && studentAnswers.studentAnswers) {
        for (const question of questions) {
          const studentAnswer = studentAnswers.studentAnswers.find((a) => a.questionId.toString() === question._id.toString());
          if (studentAnswer) {
            question.studentAnswer = studentAnswer;
          }
        }
      }

      const data = {
        ...typesResult,
        questions,
        duration: studentAssessment ? studentAssessment?.duration : null,
        submissionStatus: studentSubmission ? studentSubmission.submissionStatus : null,
        submissionId: studentSubmission ? studentSubmission._id.toString() : null,
        startedAt: studentSubmission ? studentSubmission.startedAt : null,
        endTime: studentSubmission ? studentSubmission.endTime : null
      }

      return { data: data, err: null };
    } catch (error) {
      return { data: null, err: error };
    }
  }
}

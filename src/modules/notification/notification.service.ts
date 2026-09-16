import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schema/notification.schema';
import {
  UserNotification,
  UserNotificationDocument,
} from './schema/userNotificationManagement.schema';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { UserService } from '../user/user.service';
import { CreateCommentReplyNotificationDto } from './dto/notification.dto';
import { VideoComment } from '../chapter-video-comments/schema/chaptervideo-comment.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { CourseDiscussion } from '../course-discussion/schema/course-discussion.schema';

@Injectable()
export class NotificationService {
  [x: string]: any;

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(UserNotification.name)
    private userNotificationModel: Model<UserNotificationDocument>,
    private readonly UserService: UserService,
    @InjectModel(VideoComment.name)
    private readonly videoCommentModel: Model<VideoComment>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel('CourseDiscussion')
    private readonly courseDiscussionModel: Model<any>
  ) { }

  async CreateNewNotification(
    type: NotificationType,
    courseId: string,
    videoId?: string,
    commentId?: string,
    assessmentId?: string,
  ) {
    console.log('Creating new notification:');

    try {
      if (!Object.values(NotificationType).includes(type)) {
        return { data: null, err: 'Invalid Notification Type' };
      }

      const notificationData: Partial<NotificationDocument> = { type };

      if (courseId) notificationData.courseId = new Types.ObjectId(courseId);
      if (videoId) notificationData.videoId = new Types.ObjectId(videoId);
      if (commentId) notificationData.commentId = new Types.ObjectId(commentId);
      // if (assessmentId) notificationData.assessmentId = new Types.ObjectId(assessmentId);

      if ((
        type === NotificationType.ASSIGN_ASSESSMENT ||
        type === NotificationType.ASSESSMENT_GRADED ||
        type === NotificationType.ASSESSMENT_REMINDER ||
        type === NotificationType.GRADE_REMINDER 
      ) && assessmentId) {
        notificationData.assessmentId = new Types.ObjectId(assessmentId);
      }

      const notification =
        await this.notificationModel.create(notificationData);
      return { data: notification, err: null };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async createNotificationForUser(notificationId: string) {
    console.log('Creating notification for user:', notificationId);

    try {
      // Fetch all user IDs
      const notificationIdObj = new Types.ObjectId(notificationId);
      if (!Types.ObjectId.isValid(notificationIdObj)) {
        console.log('Invalid notification ID');
        return { data: null, err: 'Invalid notification ID' };
      }
      const { data: userList, err } =
        await this.UserService.getAllUserMongoId();
      if (err) throw new Error('Failed to fetch user IDs');

      const users = userList.map((userId) => ({ userId, isRead: false }));

      const notification = await new this.userNotificationModel({
        notificationId: notificationIdObj,
        users,
      }).save();

      console.log('User notification created:', notification);

      const notificationData = await this.notificationModel.aggregate([
        {
          $match: {
            _id: notificationIdObj,
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        {
          $unwind: '$course',
        },
        {
          $match: {
            'course.status': 'ACTIVE',
          },
        },
        {
          $lookup: {
            from: 'usernotifications',
            localField: '_id',
            foreignField: 'notificationId',
            as: 'notification',
          },
        },
        {
          $unwind: '$notification',
        },
        {
          $project: {
            _id: 0,
            notificationId: '$_id',
            course: 1,
            type: 1,
            notificationCreatedAt: '$createdAt',
            userNotificationId: '$notification._id',
          },
        },
      ]);

      console.log(
        'Notification created for users on realtime update:',
        notificationData,
      );

      return { data: notificationData, err: null };
    } catch (error) {
      console.error('Error creating notification for user:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  // async sendNotification(id: string) {
  //   try {
  //     const userIds = '';
  //   } catch (error) {
  //     console.error('Error fetching last chapters:', error);
  //     return { data: null, err: 'Internal Server Error' };
  //   }
  // }

  async getAllNotificationsForUser(userId: string) {
    try {
      const notifications = await this.userNotificationModel.aggregate([
        {
          $match: {
            'users.userId': new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: 'notifications',
            localField: 'notificationId',
            foreignField: '_id',
            as: 'notificationDetails',
          },
        },
        {
          $unwind: '$notificationDetails',
        },
        {
          $addFields: {
            users: {
              $filter: {
                input: '$users',
                as: 'user',
                cond: {
                  $eq: ['$$user.userId', new mongoose.Types.ObjectId(userId)],
                },
              },
            },
          },
        },
        {
          $unwind: '$users',
        },
        {
          $lookup: {
            from:'courseassessments',
            localField: 'notificationDetails.assessmentId',
            foreignField: '_id',
            as: 'assessmentDetails',
          }
        },
        {
          $unwind: {
            path: '$assessmentDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from:'coursediscussions',
            localField: 'notificationDetails.discussionId',
            foreignField: '_id',
            as: 'discussions',
          }
        },
        {
          $unwind: {
            path: '$discussions',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            resolvedCourseId: {
              $ifNull: ['$notificationDetails.courseId', '$assessmentDetails.courseId', '$discussions.courseId'],
            }
          }
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'resolvedCourseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        {
          $unwind: {
            path: '$course',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            replierUserObjectId: {
              $cond: {
                if: {
                  $and: [
                    {
                      $in: [
                        '$notificationDetails.type',
                        ['comment_reply', 'course_discussion_reply'],
                      ],
                    },
                    { $ne: ['$notificationDetails.replierUserId', null] },
                    { $ne: ['$notificationDetails.replierUserId', ''] },
                  ],
                },
                then: {
                  $toObjectId: '$notificationDetails.replierUserId',
                },
                else: null,
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'replierUserObjectId',
            foreignField: '_id',
            as: 'replier',
          },
        },
        {
          $unwind: {
            path: '$replier',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            userNotificationId: '$_id',
            notificationId: 1,
            type: '$notificationDetails.type',
            isRead: '$users.isRead',
            // notificationDetails: 1,
            course: 1,
            // message: {
            //   $ifNull: ['$message', null]
            // },
            message: {
              $cond: {
                // if: { $eq: ['$notificationDetails.type', 'comment_reply'] },
                if: {
                  $in: [
                    '$notificationDetails.type',
                    ['comment_reply', 'course_discussion_reply']
                  ]
                },
                then: { $ifNull: ['$notificationDetails.message', null] },
                else: { $ifNull: ['$message', null] }
              }
            },
            createdAt: '$notificationDetails.createdAt',
            replierProfileImg: '$replier.profileImg',
            replierUserName: '$replier.firstName'
            // notificationCreatedAt: '$notificationDetails.createdAt'
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);

      return { data: notifications, err: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  // async getAllNotificationsForAdmin(
  //   page: number,
  //   limit: number,
  //   userId: string, // <-- required for per-user read status
  //   search?: string,
  //   filter?: string,
  // ) {
  //   try {
  //     const skip = (page - 1) * limit;
  //     if (!mongoose.Types.ObjectId.isValid(userId)) {
  //       console.error('Invalid userId:', userId);
  //       return { data: null, err: 'Invalid userId' };
  //     }
  //     const userObjectId = new mongoose.Types.ObjectId(userId);
  //     const pipeline: any[] = [
  //       // Lookup replier user info
  //       {
  //         $lookup: {
  //           from: 'users',
  //           let: { userId: { $toObjectId: '$replierUserId' } },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: { $eq: ['$_id', '$$userId'] },
  //               },
  //             },
  //             {
  //               $project: { firstName: 1 },
  //             },
  //           ],
  //           as: 'replierUser',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$replierUser',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },

  //       // Lookup course info
  //       {
  //         $lookup: {
  //           from: 'courses',
  //           localField: 'courseId',
  //           foreignField: '_id',
  //           as: 'course',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$course',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },

  //       // Lookup user notification status for current user
  //       {
  //         $lookup: {
  //           from: 'usernotifications',
  //           let: { notifId: '$_id', currentUserId: userObjectId },
  //           pipeline: [
  //             {
  //               $match: {
  //                 $expr: { $eq: ['$notificationId', '$$notifId'] },
  //               },
  //             },
  //             { $unwind: '$users' },
  //             // {
  //             //   $match: {
  //             //     $expr: { $eq: ['$users.userId', '$$currentUserId'] },
  //             //   },
  //             // },
  //             {
  //               $project: {
  //                 _id: 0,
  //                 isRead: '$users.isRead',
  //                 message: 1
  //               },
  //             },
  //           ],
  //           as: 'userReadStatus',
  //         },
  //       },
  //       {
  //         $addFields: {
  //           isRead: {
  //             $cond: [
  //               { $gt: [{ $size: '$userReadStatus' }, 0] },
  //               { $arrayElemAt: ['$userReadStatus.isRead', 0] },
  //               false, // default if not found
  //             ],
  //           },
  //           message: {
  //             $cond: [
  //               { $gt: [{ $size: '$userReadStatus' }, 0] },
  //               { $ifNull: [{ $arrayElemAt: ['$userReadStatus.message', 0] }, null] },
  //               null,
  //             ],
  //           },
  //         },
  //       },

  //       // Search logic
  //       ...(search?.trim()
  //         ? [
  //             {
  //               $match: {
  //                 $expr: {
  //                   $regexMatch: {
  //                     input: {
  //                       $cond: [
  //                         { $eq: ['$type', 'new_course'] },
  //                         { $concat: ['New course "', '$course.title', '" created.'] },
  //                         {
  //                           $cond: [
  //                             { $eq: ['$type', 'comment_reply'] },
  //                             {
  //                               $concat: [
  //                                 { $ifNull: ['$replierUser.firstName', 'Unknown User'] },
  //                                 ' commented: ',
  //                                 '$message',
  //                               ],
  //                             },
  //                             '',
  //                           ],
  //                         },
  //                       ],
  //                     },
  //                     regex: search,
  //                     options: 'i',
  //                   },
  //                 },
  //               },
  //             },
  //           ]
  //         : []),

  //       // Filter by type if needed
  //       ...(filter === 'COURSE UPDATES'
  //         ? [
  //             {
  //               $match: {
  //                 type: 'new_course',
  //               },
  //             },
  //           ]
  //         : []),

  //       // Final projection
  //       {
  //         $project: {
  //           _id: 1,
  //           type: 1,
  //           // message: 1,
  //           commentId: 1,
  //           createdAt: 1,
  //           isRead: 1,
  //           replierUsername: {
  //             $cond: {
  //               if: { $eq: ['$type', 'comment_reply'] },
  //               then: { $ifNull: ['$replierUser.firstName', 'Unknown User'] },
  //               else: '$$REMOVE',
  //             },
  //           },
  //           course: {
  //             $cond: {
  //               if: { $eq: ['$type', 'new_course'] },
  //               then: {
  //                 title: '$course.title',
  //                 createdBy: '$course.createdBy',
  //                 createdAt: '$course.createdAt',
  //                 courseCode: '$course.courseCode',
  //               },
  //               else: '$$REMOVE',
  //             },
  //           },
  //           formattedMessage: {
  //             $cond: [
  //               {$ne: ['$message', null]},
  //               '$message',
  //               {
  //                 $cond: [
  //                   { $eq: ['$type', 'new_course'] },
  //                   {
  //                     $concat: ['New course "', '$course.title', '" created.'],
  //                   },
  //                   {
  //                     $cond: [
  //                       { $eq: ['$type', 'comment_reply'] },
  //                       {
  //                         $concat: [
  //                           { $ifNull: ['$replierUser.firstName', 'Unknown User'] },
  //                           ' commented: ',
  //                           '$message',
  //                         ],
  //                       },
  //                       // '$$REMOVE',
  //                       null
  //                     ],
  //                   },
  //                 ],
  //               }
  //             ]
  //           },
  //         },
  //       },

  //       { $sort: { createdAt: -1 } },
  //       { $skip: skip },
  //       { $limit: limit },
  //     ];

  //     const notifications = await this.notificationModel.aggregate(pipeline);

  //     // Build count pipeline
  //     const countPipeline = pipeline.filter(
  //       stage =>
  //         !('$skip' in stage) &&
  //         !('$limit' in stage) &&
  //         !('$sort' in stage) &&
  //         !('$project' in stage),
  //     );
  //     countPipeline.push({ $count: 'total' });

  //     const totalResult = await this.notificationModel.aggregate(countPipeline);
  //     const totalCount = totalResult[0]?.total || 0;

  //     return {
  //       data: {
  //         notifications,
  //         totalCount,
  //         currentPage: page,
  //         totalPages: Math.ceil(totalCount / limit),
  //       },
  //     };
  //   } catch (error) {
  //     console.error('Error fetching notifications:', error);
  //     return { data: null, err: 'Internal Server Error' };
  //   }
  // }


  async getAllNotificationsForAdmin(
    page: number,
    limit: number,
    userId: string,
    search?: string,
    filter?: string,
  ) {
    try {
      const tutor = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(tutor && ((tutor.roleId as any).roleName === 'admin' ||(tutor.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }
      
      const skip = (page - 1) * limit;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return { data: null, err: 'Invalid userId' };
      }
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const pipeline: any[] = [
        // 🔹 Lookup replier user info (for comment replies)
        {
          $lookup: {
            from: 'users',
            let: { userId: { $toObjectId: '$replierUserId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
              { $project: { firstName: 1, lastName: 1 } },
            ],
            as: 'replierUser',
          },
        },
        { $unwind: { path: '$replierUser', preserveNullAndEmptyArrays: true } },
        // 🔹 Lookup student assessments if notification is assessment related
        {
          // Lookup student assessments (don't unwind)
          $lookup: {
            from: 'studentassessments',
            localField: 'assessmentId',
            foreignField: 'assessmentId',
            as: 'studentAssessments',
          },
        },
        // Use the first studentAssessment for tutor/student info
        {
          $addFields: {
            studentAssessment: { $arrayElemAt: ['$studentAssessments', 0] },
          },
        },
        {
          $lookup: {
            from: 'coursediscussions',
            localField: 'discussionId',
            foreignField: '_id',
            as: 'discussion',
          },
        },
        {
          $unwind: {
            path: '$discussion',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from:'videocomments',
            localField: 'commentId',
            foreignField: '_id',
            as:'videoComment',  
          }
        },
        {
          $unwind: {
            path: '$videoComment',
            preserveNullAndEmptyArrays: true,
          }
        },
        {
          $lookup: {
            from:'videochapters',
            localField: 'videoComment.videoId',
            foreignField: '_id',
            as:'videoChapter',  
          }
        },
        {
          $unwind: {
            path: '$videoChapter',
            preserveNullAndEmptyArrays: true,
          }
        },
        {
          $lookup: {
            from: 'chapters',
            let: { videoId: '$videoChapter._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$videoId', '$$videoId'],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'chapter',
          },
        },
        {
          $set: {
            chapter: { $arrayElemAt: ['$chapter', 0] },
          },
        },
        {
          $unwind: {
            path: '$chapter',
            preserveNullAndEmptyArrays: true,
          }
        },
        {
          $lookup: {
            from:'coursemodules',
            localField: 'chapter.moduleId',
            foreignField: '_id',
            as:'courseModules',  
          }
        },
        {
          $unwind: {
            path: '$courseModules',
            preserveNullAndEmptyArrays: true,
          }
        },
        {
          $lookup: {
            from: 'courseassessments',
            localField: 'assessmentId',
            foreignField: '_id',
            as: 'assessment',
          },
        },
        { $unwind: { path: '$assessment', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            resolvedCourseId: {
              $switch: {
                branches: [
                  // discussion reply
                  {
                    // case: { $eq: ['$type', 'new_course'] },
                    case:{$in: ['$type', ['new_course', 'course_completion']]},
                    then: '$courseId',
                  },
                  {
                    case: { $eq: ['$type', 'course_discussion_reply'] },
                    then: '$discussion.courseId',
                  },
                  {
                    case: { $eq: ['$type', 'comment_reply'] },
                    then: '$courseModules.courseId',
                  },
                  {
                    case: {
                      $in: [
                        '$type',
                        [
                          'assign_assessment',
                          'assessment_graded',
                          'assessment_reminder',
                          'grade_reminder',
                        ],
                      ],
                    },
                    then: '$assessment.courseId',
                  },
                ],
                default: null,
              },
            },
          },
        },
        // 🔹 Lookup course info
        {
          $lookup: {
            from: 'courses',
            localField: 'resolvedCourseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
        ...(isSuperAdmin
        ? []
        : [
            {
              $match: {
                'course.createdBy': new Types.ObjectId(userId),
              },
            },
          ]),
        // Lookup tutor
        {
          $lookup: {
            from: 'users',
            localField: 'studentAssessment.createdBy',
            foreignField: '_id',
            as: 'tutorUser',
          },
        },
        {
          $addFields: {
            tutorUser: { $arrayElemAt: ['$tutorUser', 0] },
          },
        },

        // Lookup student
        {
          $lookup: {
            from: 'users',
            localField: 'studentAssessment.studentId',
            foreignField: '_id',
            as: 'studentUser',
          },
        },
        {
          $addFields: {
            studentUser: { $arrayElemAt: ['$studentUser', 0] },
          },
        },

        // 🔹 Lookup assessment info

        // 🔹 Lookup user notification read status for this user
        {
          $lookup: {
            from: 'usernotifications',
            let: { notifId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$notificationId', '$$notifId'] } } },
              { $unwind: '$users' },
              { $match: { $expr: { $eq: ['$users.userId', userObjectId] } } },
              { $project: { _id: 0, isRead: '$users.isRead', message: 1 } },
            ],
            as: 'userReadStatus',
          },
        },

        {
          $lookup: {
            from: 'usernotifications',
            let: { notifId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$notificationId', '$$notifId'] },
                },
              },
              {
                $project: {
                  _id: 0,
                  isAdminRead: 1,
                },
              },
            ],
            as: 'adminReadStatus',
          },
        },
        {
          $lookup: {
            from: 'usernotifications',
            let: { notifId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$notificationId', '$$notifId'],
                  },
                },
              },
              {
                $unwind: '$users',
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'users.userId',
                  foreignField: '_id',
                  as: 'learner',
                },
              },
              {
                $unwind: {
                  path: '$learner',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 0,
                  learnerName: {
                    $concat: [
                      { $ifNull: ['$learner.firstName', ''] },
                      ' ',
                      { $ifNull: ['$learner.lastName', ''] },
                    ],
                  },
                },
              },
            ],
            as: 'learnerDetails',
          },
        },

        // 🔹 Add full names and assessment title
        {
          $addFields: {
            isRead: { $ifNull: [{ $arrayElemAt: ['$userReadStatus.isRead', 0] }, false] },
            isAdminRead: { $ifNull: [{ $arrayElemAt: ['$adminReadStatus.isAdminRead', 0] }, false] },
            // message: { $ifNull: [{ $arrayElemAt: ['$userReadStatus.message', 0] }, null] },
            message: {
              $ifNull: [
                { $arrayElemAt: ['$userReadStatus.message', 0] },
                '$message'
              ]
            },
            tutorName: { $concat: [{ $ifNull: ['$tutorUser.firstName', 'Tutor'] }, ' ', { $ifNull: ['$tutorUser.lastName', ''] }] },
            studentName: { $concat: [{ $ifNull: ['$studentUser.firstName', 'Student'] }, ' ', { $ifNull: ['$studentUser.lastName', ''] }] },
            assessmentTitle: { $ifNull: ['$assessment.title', 'Assessment'] },
            learnerName: {
              $ifNull: [
                { $arrayElemAt: ['$learnerDetails.learnerName', 0] },
                'Learner',
              ],
            },
          },
        },

        // 🔹 Filter by type
        ...(filter === 'COURSE UPDATES' ? [{ $match: { type: 'new_course' } }] : []),
        ...(filter === 'UNREAD' ? [{ $match: { isAdminRead: false } }] : []),

        // 🔹 Build formatted message for each notification type
        {
          $addFields: {
            formattedMessage: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$type', 'assign_assessment'] },
                    then: { $concat: ['$tutorName', ' assigned ', '$assessmentTitle', ' to ', '$studentName'] },
                  },
                  {
                    case: { $eq: ['$type', 'assessment_graded'] },
                    then: { $concat: ['$tutorName', ' graded ', '$studentName', ' for ', '$assessmentTitle'] },
                  },
                  {
                    case: { $eq: ['$type', 'assessment_reminder'] },
                    then: { $concat: ['Reminder: ', '$tutorName', ' reminded ', '$studentName', ' about ', '$assessmentTitle'] },
                  },
                  {
                    case: { $eq: ['$type', 'new_course'] },
                    then: { $concat: ['New course "', '$course.title', '" created.'] },
                  },
                  {
                    case: { $eq: ['$type', 'comment_reply'] },
                    then: { $concat: [{ $ifNull: ['$replierUser.firstName', 'Unknown User'] }, ' replied to a comment: ', '$message'] },
                  },
                  {
                    case: { $eq: ['$type', 'course_discussion_reply'] },
                    then: { $concat: [{ $ifNull: ['$replierUser.firstName', 'Unknown User'] }, ' replied to a discussion thread: ', '$message'] },
                  },
                  {
                    case: { $eq: ['$type', 'grade_reminder'] },
                    then: { $concat: ['Reminder: ', 'Assessment ', '$assessmentTitle', ' needs to be graded.'] },
                  },
                  {
                    case: {
                      $eq: ['$type', 'course_completion'],
                    },
                    then: {
                      $concat: [
                        '$learnerName',
                        ' has completed the course "',
                        '$course.title',
                        '".',
                      ],
                    },
                  },
                ],
                default: 'Notification',
              },
            },
          },
        },
        // 🔹 Search
        ...(search?.trim()
          ? [
            {
              $match: {
               formattedMessage: {
                  $regex: search,
                  $options: 'i',
                },
              },
            },
          ]
          : []),

        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];

      const notifications = await this.notificationModel.aggregate(pipeline);

      // Count total notifications
      const countPipeline = pipeline.filter(
        (stage) => 
          !('$skip' in stage) && 
          !('$limit' in stage) && 
          !('$sort' in stage) 
          // && !('$addFields' in stage)
      );
      
      countPipeline.push({ $count: 'total' });
      const totalResult = await this.notificationModel.aggregate(countPipeline);
      const totalCount = totalResult[0]?.total || 0;

      return {
        data: {
          notifications,
          totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async markOneUserNotificationAsRead(userId: string, notificationId: string) {
    try {
      const user = await this.userModel.findById(userId).populate('roleId')

      const role = (user?.roleId as any)?.roleName;

      const isAdmin = ['admin', 'tutor'].includes(role);

      const updatedNotification = await this.userNotificationModel.findOneAndUpdate(
        isAdmin
          ? { notificationId: new Types.ObjectId(notificationId) }
          : {
              notificationId: new Types.ObjectId(notificationId),
              'users.userId': new Types.ObjectId(userId),
            },
        {
          $set: isAdmin
            ? { isAdminRead: true }
            : { 'users.$.isRead': true },
        },
        { new: true },
      );

      if (!updatedNotification) {
        return { data: null, err: 'Notification not found or already read' };
      }

      return { data: 'Notification marked as read', err: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }


  async markAllUserNotificationsAsRead(userId: string) {
    try {
      const updatedNotifications = await this.userNotificationModel.updateMany(
        {
          'users.userId': new Types.ObjectId(userId),
        },
        // { $set: { 'users.$.isRead': true } },
        {
          $set: {
            'users.$[elem].isRead': true,
          },
        },
        {
          arrayFilters: [
            {
              'elem.userId': new Types.ObjectId(userId),
            },
          ],
        },
      );

      if (updatedNotifications.matchedCount === 0) {
        return { data: null, err: 'No notifications found for user' };
      }

      return { data: 'All notifications marked as read', err: null };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  // async notifyNewCourseCreation(
  //   courseId: string,
  //   message: string,
  //   userIds: string[],
  // ) {
  //   const notification = await this.notificationModel.create({
  //     type: 'new_course',
  //     message,
  //     courseId,
  //   });

  //   // Create user notifications for each user
  //   const userNotifications = userIds.map((userId) => ({
  //     userId,
  //     notificationId: notification._id,
  //     isRead: false,
  //   }));

  //   await this.userNotificationModel.insertMany(userNotifications);
  //   return { success: true, notification };
  // }

  // async notifyNewComment(
  //   courseId: string,
  //   videoId: string,
  //   commentId: string,
  //   commenterId: string,
  //   courseCreatorId: string,
  //   otherCommenters: string[],
  // ) {
  //   const notification = await this.notificationModel.create({
  //     type: 'new_comment',
  //     message: `A new comment has been added to the video.`,
  //     courseId,
  //     videoId,
  //     commentId,
  //   });

  //   // Users to notify (Course creator + other commenters excluding the one who commented)
  //   const usersToNotify = new Set([courseCreatorId, ...otherCommenters]);
  //   usersToNotify.delete(commenterId); // Exclude the user who made the comment

  //   const userNotifications = Array.from(usersToNotify).map((userId) => ({
  //     userId,
  //     notificationId: notification._id,
  //     isRead: false,
  //   }));

  //   await this.userNotificationModel.insertMany(userNotifications);
  //   return { success: true, notification };
  // }

  async deleteNotification(CourseId: string) {
    try {
      const courseIdObj = new Types.ObjectId(CourseId);
      const deletedNotification =
        await this.notificationModel.findByIdAndDelete({
          courseId: courseIdObj,
        });
      const deletedUserNotification =
        await this.userNotificationModel.deleteMany({
          notificationId: deletedNotification._id,
        });
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  // comment reply notification

  async notifyCommentReply(replyCommentId: Types.ObjectId, replierId: string) {
    try {
      const reply = await this.videoCommentModel
        .findById(replyCommentId)
        .populate('parentId');

      if (!reply || !reply.parentId)
        return { data: null, err: 'Reply has no parent' };

      const parentComment = await this.videoCommentModel
        .findById(reply.parentId)
        .populate('userId');

      if (!parentComment || !parentComment.userId)
        return { data: null, err: 'Parent comment not found' };

      const originalAuthorId = parentComment.userId._id;

      // console.log('repliess of comment', reply);

      const notification = await new this.notificationModel({
        type: NotificationType.COMMENT_REPLY,
        commentId: replyCommentId,
        replierUserId: replierId,
        message: reply?.comment,
      }).save();

      // console.log('notificationreplierId', replierId);

      const userNotification = await new this.userNotificationModel({
        notificationId: notification._id,
        users: [{ userId: originalAuthorId, isRead: false }],
      }).save();

      const notificationData = {
        notificationId: notification._id.toString(),
        userNotificationId: userNotification._id.toString(),
        type: NotificationType.COMMENT_REPLY,
        isRead: false,
        // createdAt: notification.createdAt,
        message: notification.message,
        receiverUserId: originalAuthorId.toString(), // needed for targeting socket room
      };

      return { data: notificationData, err: null };
    } catch (err) {
      // console.log('err isss', err);

      console.error('Error in notifyCommentReply:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  // get all comment reply notification

  async getAllReplyCommentNotifications(userId: string) {
    try {
      const userNotifications = await this.userNotificationModel
        .find({ 'users.userId': userId })
        .populate({
          path: 'notificationId',
          match: { type: { $in: [NotificationType.COMMENT_REPLY, NotificationType.COURSE_DISCUSSION_REPLY] } },
          populate: {
            path: 'replierUserId',
            select: 'firstName profileImg',
          },
        });

      const filtered = userNotifications.filter(
        (n) => n.notificationId !== null,
      );

      const notifications = filtered.map((userNotif) => {
        const notif: any = userNotif.notificationId;
        const userData = userNotif.users.find(
          (u) => u.userId.toString() === userId.toString(),
        );

        return {
          notificationId: notif._id.toString(),
          userNotificationId: userNotif._id.toString(),
          type: notif.type,
          message: notif.message,
          isRead: userData?.isRead ?? false,
          receiverUserId: userId,
          commentId: notif.commentId || notif.discussionId || null,
          createdAt: notif.createdAt,
          replier: notif.replierUserId && {
            userId: notif.replierUserId['_id'],
            username: notif.replierUserId['firstName'],
            profileImg: notif.replierUserId['profileImg'],
          },
        };
      });

      return { data: notifications, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async notifyDiscussionReply(replyDiscussionId: Types.ObjectId, replierId: string) {
    try {
      const reply = await this.courseDiscussionModel
        .findById(replyDiscussionId)
        .populate('parentId');

      if (!reply || !reply.parentId)
        return { data: null, err: 'Reply has no parent' };

      const parentPost = await this.courseDiscussionModel
        .findById(reply.parentId)
        .populate('userId');

      if (!parentPost || !parentPost.userId)
        return { data: null, err: 'Parent discussion post not found' };

      const originalAuthorId = parentPost.userId._id;

      const notification = await new this.notificationModel({
        type: NotificationType.COURSE_DISCUSSION_REPLY,
        discussionId: replyDiscussionId,
        replierUserId: replierId,
        message: reply?.comment,
      }).save();

      const userNotification = await new this.userNotificationModel({
        notificationId: notification._id,
        users: [{ userId: originalAuthorId, isRead: false }],
      }).save();

      const notificationData = {
        notificationId: notification._id.toString(),
        userNotificationId: userNotification._id.toString(),
        type: NotificationType.COURSE_DISCUSSION_REPLY,
        isRead: false,
        message: notification.message,
        receiverUserId: originalAuthorId.toString(),
      };

      return { data: notificationData, err: null };
    } catch (err) {
      console.error('Error in notifyDiscussionReply:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }
  

  async assignNotificationToUsers(notificationId: string, userIds: string[], message: string, createNew: boolean) {
    try {
      if (!Types.ObjectId.isValid(notificationId)) {
        return { data: null, err: 'Invalid notification Id.' }
      }

      const users = userIds.map((id) => ({
        userId: new Types.ObjectId(id),
        isRead: false
      }))

      let notification = null;

      if(createNew === true) {
        notification = await this.userNotificationModel.create({
          notificationId: new Types.ObjectId(notificationId),
          users,
          message,
        });
      }else {
        notification = await this.userNotificationModel.findOneAndUpdate(
          { notificationId: new Types.ObjectId(notificationId) },
          {
            $addToSet: {
              users: { $each: users }
            },
            message: message,
          },
          {
            new: true,
            upsert: true
          }
        )
      }

      // console.log('assigned notifications.')

      return { data: notification, err: null };
    } catch (error) {
      return { data: null, err: error }
    }
  }
}

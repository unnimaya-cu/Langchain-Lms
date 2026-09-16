import { Injectable, Search } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserCourses } from './schema/usercourses.schema';
import mongoose, { Model } from 'mongoose';
import { UserCoursesDto } from './dto/usercourses.dto';
import { Types } from 'mongoose';
import { ChapterService } from 'src/modules/chapter/chapter.service';
import { UserCourseChapter } from '../userCourseChapters/schema/usercourseschapters.schema';
import { UserChapterStatusType } from 'src/common/enum/userchapterstatus-type.enum';
import { CourseStatusType } from 'src/common/enum/coursestatus-type.enum';
import { StatusType } from 'src/common/enum/status-type.enum';
import { Chapter } from 'src/modules/chapter/schema/chapter.schema';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { NotificationDocument, Notification } from 'src/modules/notification/schema/notification.schema';
import { Course } from 'src/modules/course/schema/course.schema';

@Injectable()
export class UsercoursesService {
  constructor(
    @InjectModel(UserCourses.name)
    private readonly userCourseModel: Model<UserCourses>,
    @InjectModel(UserCourseChapter.name)
    private readonly userCourseChapterModel: Model<UserCourseChapter>,
    private chapterService: ChapterService,
    @InjectModel(Chapter.name)
    private readonly chapterModel: Model<Chapter>,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(Course.name)
    private courseModel: Model<Course>,
  ) {}

  async addMyLearningCourse(dto: UserCoursesDto) {
    console.log('dto ', dto);
    try {
      const purchasedCourse = await new this.userCourseModel(dto).save();

      let chapters = await this.chapterService.getAllChapterIdByCourse(
        purchasedCourse.courseId,
      );

      const chapterDocs = await this.chapterModel.find({
        _id: { $in: chapters.data },
        status: { $ne: StatusType.DELETED },
      });

      const userCourseChapters = chapterDocs.map((chapter) => ({
        userCourseId: purchasedCourse._id,
        chapterId: chapter?._id,
        status: UserChapterStatusType.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      await this.userCourseChapterModel.insertMany(userCourseChapters);

      return { data: purchasedCourse, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getMyLearningCourses(userId: string, page?:number, limit?:number) {
    try {
      const searchQuery = [
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        { $unwind: '$courseDetails' },
        // ✅ Only include active courses
        { $match: { 'courseDetails.status': CourseStatusType.ACTIVE } },

        // {
        //   $lookup: {
        //     from: 'ratingreviews',
        //     localField: 'courseId',
        //     foreignField: 'courseId',
        //     as: 'ratings',
        //     pipeline: [
        //       { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        //     ],
        //   },
        // },
        // { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: 'courseId',
            foreignField: 'courseId',
            as: 'allRatings',
          },
        },
        {
          $lookup: {
            from: 'ratingreviews',
            let: { courseId: '$courseId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$courseId', '$$courseId'] },
                      { 
                        $eq: [
                          '$userId',
                          new mongoose.Types.ObjectId(userId)
                        ] 
                      }
                    ]
                  }
                }
              }
            ],
            as: 'userRatingData',
          },
        },
        {
          $addFields: {
            // All users rating summary
            totalRating: {
              $round: [
                { $avg: '$allRatings.rating' },
                1
              ]
            },
            totalReview: {
              $size: '$allRatings'
            },

            // Logged-in user rating
            userRating: {
              $arrayElemAt: [
                '$userRatingData.rating',
                0
              ]
            },
            userReview: {
              $arrayElemAt: [
                '$userRatingData.review',
                0
              ]
            }
          }
        }
        // {
        //   $project: {
        //     _id: 1,
        //     courseId: 1,
        //     progressPercentage: 1,
        //     purchasedDate: 1,
        //     courseDetails: 1,
        //     userRating: '$ratings.rating',
        //     userReview: '$ratings.review',
        //   },
        // },
      ];

      const totalCoursesResult = await this.userCourseModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalCourses = totalCoursesResult[0]?.total || 0;

      const data = await this.userCourseModel.aggregate([
        ...searchQuery,
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit,
        },
        {
          $project: {
            _id: 1,
            courseId: 1,
            progressPercentage: 1,
            purchasedDate: 1,
            courseDetails: 1,
            userRating: 1,
            userReview: 1,
            totalRating: 1,
            totalReview: 1,
          },
        },
      ]);

      return {
        data: {
          courses: data,
          totalCourses,
          totalPages: Math.ceil(totalCourses / limit),
          currentPage: page,
        },
        err: null,
      };

      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async enrolledCoursesForAdminPanel(userId: string) {
    try {
      const data = await this.userCourseModel.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },

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
          $lookup: {
            from: 'categories',
            localField: 'course.categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $unwind: '$category',
        },
        {
          $project: {
            userId: 1,
            courseCode: '$course.courseCode',
            courseName: '$course.title',
            categoryName: '$category.name',
            progress: '$progressPercentage',
          },
        },
      ]);
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async updateChapterStatus(
    chapterid: string,
    userId: string,
    courseId: string,
  ) {
    try {
      const objectid = new Types.ObjectId(chapterid);
      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(courseId);

      const userCourse = await this.userCourseModel.findOne({
        userId: userObjectId,
        courseId: courseObjectId,
      });
      // find error

      const data = await this.userCourseChapterModel
        .findOneAndUpdate(
          { chapterId: objectid, userCourseId: userCourse?._id },
          { status: UserChapterStatusType.INPROGRESS },
          { new: true },
        )
        .exec();        
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async updateCompleteChapterStatusAndUpdateProgress(
    chapterId: string,
    userId: string,
    courseId: string,
  ) {
    try {
      const objectId = new Types.ObjectId(chapterId);
      const userObjectId = new Types.ObjectId(userId);
      const courseObjectId = new Types.ObjectId(courseId);

      const userCourse = await this.userCourseModel.findOne({
        userId: userObjectId,
        courseId: courseObjectId,
      });
      const chapter = await this.userCourseChapterModel.findOne({
        chapterId: objectId,
        userCourseId: userCourse._id,
      });
      // if (!chapter) {
      //   return { data: null, err: 'Chapter not found' };
      // }
      console.log('chapter', chapter);

      const course = await this.courseModel.findById(courseObjectId);

      let statusUpdated = false;
      const wasCompleted = userCourse.progressPercentage === 100;

      if (chapter.status === UserChapterStatusType.INPROGRESS) {
        chapter.status = UserChapterStatusType.COMPLETED;
        statusUpdated = true;
        if (!chapter.isCompleted) {
          chapter.isCompleted = true;
        }
      } 
      else if (chapter.status === UserChapterStatusType.COMPLETED ){
        chapter.status = UserChapterStatusType.INPROGRESS
        statusUpdated=true
      }
      // else {
      //   return { data: null, err: 'Chapter status is not IN_PROGRESS' };
      // }

      await chapter.save();

      const userCourseId = chapter.userCourseId;
      const allChapters = await this.userCourseChapterModel.find({
        userCourseId,
      });

      if (!allChapters.length) {
        return { data: null, err: 'No chapters found for this user course' };
      }

      const completedChapters = allChapters.filter(
        (ch) => ch.isCompleted === true,
      ).length;
      const totalChapters = allChapters.length;
      let progressPercentage = (completedChapters / totalChapters) * 100;

      if (completedChapters === totalChapters) {
        progressPercentage = 100;
      }

      await this.userCourseModel.findByIdAndUpdate(userCourseId, {
        progressPercentage,
        updatedAt: new Date(),
      });

      if (!wasCompleted && progressPercentage === 100) {
        let notification = await this.notificationModel.findOne({
          type: NotificationType.ASSESSMENT_GRADED,
          courseId: courseObjectId,
        })
        
        if(!notification) {
          const created = await this.notificationService.CreateNewNotification(
            NotificationType.COURSE_COMPLETION,
            courseId,
            undefined,
            undefined,
            undefined
          );
                  
          notification = created.data;
        }
                                
        const message = `Congratulations! You have completed the course ${course?.title}.`;
        
        await this.notificationGateway.sendNotificationToUser(
          notification._id.toString(),
          [userId],
          message
        );
      }

      return {
        data: {
          status:chapter.status,
          message: `Chapter status updated to ${chapter.status}`,
          progressPercentage: progressPercentage.toFixed(2),
          completedChapters,
          totalChapters,
        },
        err: null,
      };
    } catch (err) {
      console.log("errrr",err);

      return { data: null, err: err };
    }
  }

  async completedCourses(userid: string) {
    try {
      const userObjectId = new Types.ObjectId(userid);

      const completedCourses = await this.userCourseModel.aggregate([
        {
          $match: { userId: userObjectId, progressPercentage: 100 },
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
          $unwind: '$courseDetails',
        },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: 'courseId',
            foreignField: 'courseId',
            as: 'ratings',
          },
        },
        {
          $project: {
            _id: 1,
            // userId: 1,
            // progressPercentage: 1,
            'courseDetails._id': 1,
            'courseDetails.title': 1,
            'courseDetails.description': 1,
            'courseDetails.courseImg': 1,
            averageRating: {
              $avg: '$ratings.rating',
            },
            ratingCount: {
              $size: '$ratings',
            },
          },
        },
      ]);

      return { data: completedCourses, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async completedCoursesForAdmin(userid: string) {
    try {
      const userObjectId = new Types.ObjectId(userid);

      const completedCourses = await this.userCourseModel.aggregate([
        {
          $match: {
            userId: userObjectId,
            progressPercentage: 100,
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
          $unwind: '$courseDetails',
        },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: 'courseId',
            foreignField: 'courseId',
            as: 'ratings',
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'courseDetails.categoryId',
            foreignField: '_id',
            as: 'category',
          },
        },
        {
          $project: {
            _id: 0,
            courseCode: '$courseDetails.courseCode',
            title: '$courseDetails.title',
            categoryName: {
              $arrayElemAt: ['$category.name', 0],
            },
            averageRating: {
              $avg: '$ratings.rating',
            },
            ratingCount: {
              $size: '$ratings',
            },
          },
        },
      ]);

      return { data: completedCourses, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getUsersByCourse(courseId: string, search?: string) {
    try {
      const searchQuery:any = [
        {
          $match:{
            courseId: new Types.ObjectId(courseId),
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
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'roles', 
            localField: 'user.roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        { $unwind: '$role' },
        {
          $match:{
            'role.roleName': { $nin: ['admin', 'super admin', 'tutor'] }
          }
        },
        {
          $match: search
          ? {
              $or:[
                {'user.firstName': { $regex: search, $options: 'i'}},
                {'user.lastName': { $regex: search, $options: 'i'}},
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $concat: ['$user.firstName', ' ', '$user.lastName'],
                      },
                      regex: search,
                      options: 'i',
                    }
                  }
                }
              ]
            }
            : {}
        }
      ]
      const users = await this.userCourseModel.aggregate([
        ...searchQuery,
        {$sort: {'user.firstName': 1}},
        {
          $project:{
            _id: 0,
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            userId: '$user._id',
          }
        }
      ])
      return { data: users, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getUsersForGroup(
    courseId: string,
    year: number,
    month: number,
    startIndex?: number,
    noOfItems?: number,
    search?: string) {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);

      const searchQuery: any = [
        {
          $match: {
            courseId: new Types.ObjectId(courseId),
            createdAt: { $gte: startDate, $lte: endDate },
          },
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
          $lookup: {
            from: 'users', 
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'roles', 
            localField: 'user.roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        { $unwind: '$role' },
        {
          $match:{
            'role.roleName': { $nin: ['admin', 'super admin', 'tutor'] }
          }
        }
      ]

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        searchQuery.push({
          $match: {
            $or: [
              { 'user._id': search },
              { 'user.firstName': searchRegex },
              { 'user.lastName': searchRegex },
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                    regex: searchRegex,
                  },
                },
              },
            ],
          },
        });
      }

      const users = await this.userCourseModel.aggregate([
        ...searchQuery,
        {$sort:{'user.firstName': 1}},
        {$skip: startIndex || 0},
        {$limit: noOfItems || 10},
        {
          $project: {
            _id: 0,
            userId: '$user._id',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
          }
        }
      ])

      return { data: users, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async updateLearningTime(courseId: string, userId: string) {
    try{
      const userCourse = await this.userCourseModel.findOne({
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId)
      }).sort({createdAt: -1})

      if(!userCourse) {
        return { data: null, err: 'User course not found' };
      }

      await this.userCourseModel.updateOne(
        {
          userId,
          courseId,
        },
        {
          $inc: {
            learningTimeSeconds: 60,
          },
        },
      );
      return {data: userCourse, err: null}
    }catch(error) {
      return { data: null, err: error };
    } 
  }
}

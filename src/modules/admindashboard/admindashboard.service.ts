import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course } from '../course/schema/course.schema';
import { User } from '../user/schema/user.schema';
import { StatusType } from 'src/common/enum/status-type.enum';

@Injectable()
export class AdmindashboardService {
  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) { }

  async getAdminDashboardData() {
    try {
      const courseCount = await this.courseModel.countDocuments();
      const userCount = await this.userModel.countDocuments();

      // Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Count courses added within the last 30 days
      const recentCourseCount = await this.courseModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      // Count users joined within the last 30 days
      const recentUserCount = await this.userModel.countDocuments({
        joinedDate: { $gte: thirtyDaysAgo },
      });

      const topCourses = await this.courseModel.aggregate([
        {
          $match: {status: {$ne: StatusType.DELETED}}
        },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: '_id',
            foreignField: 'courseId',
            as: 'rating',
          },
        },
        {
          $addFields: {
           rating: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: '$rating',
                    },
                    
                    0,
                  ],
                },
                then: {
                  $avg: '$rating.rating',
                },
                else: 0,
              },
            },
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
          $addFields: {
            category: { $arrayElemAt: ['$categoryDetails.name', 0] },
          },
        },

        // 3. Lookup user count from usercourses collection
        {
          $lookup: {
            from: 'usercourses',
            localField: '_id',
            foreignField: 'courseId',
            as: 'userEnrollments',
          },
        },
        {
          $addFields: {
            users: { $size: '$userEnrollments' },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            courseCode: 1,
            courseLevel: 1,
            isPaid: 1,
            status: 1,
            rating: 1,
            category: 1,
            users: 1,
           },
        },
        {
          $sort: {
          rating: -1,
          users:-1
          },
        },
      ]).limit(5);

      return {
        data: {
          courseCount,
          userCount,
          recentCourseCount,
          recentUserCount,
          topCourses
        },
        err: null
      };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }
}

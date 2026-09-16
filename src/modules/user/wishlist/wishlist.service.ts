import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Wishlist } from './schema/wishlist.schema';
import { WishlistDto } from './dto/wishlist.dto';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private readonly wishListModel: Model<Wishlist>,
  ) { }

  async addWishlistCourse(dto: WishlistDto) {
    console.log('wishlist dto ', dto);
    try {
      const { userId, courseId } = dto;
      const wishlistCourse = await new this.wishListModel(dto).save();
      return { data: wishlistCourse, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async removeWishlistCourse(userId: string, courseId: string) {
    try {
      // const {userId,courseId}=dto
      const data = await this.wishListModel.findOneAndDelete({
        userId,
        courseId,
      });
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getWishlistCourses(userId: string, page?: number, limit?: number) {
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
        // 2. Join users using createdBy
        {
          $lookup: {
            from: 'users',
            localField: 'courseDetails.createdBy',
            foreignField: '_id',
            as: 'creatorDetails',
          },
        },
        { $unwind: '$creatorDetails' },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: 'courseId',
            foreignField: 'courseId',
            as: 'ratings',
          },
        },
        {
          $addFields: {
            averageRating: {
              $cond: {
                if: { $gt: [{ $size: '$ratings' }, 0] },
                then: { $round: [{ $avg: '$ratings.rating' }, 3] },
                else: 0,
              },
            },
            ratingCount: {
              $size: '$ratings',
            },
          },
        },
        // {
        //   $project: {
        //     'courseDetails._id': 1,
        //     'courseDetails.title': 1,
        //     'courseDetails.description': 1,
        //     'courseDetails.courseImg': 1,
        //     'courseDetails.createdBy': 1,
        //     // creator info
        //     // 👇 ADD THIS
        //     instructorName: {
        //       $concat: [
        //         '$creatorDetails.firstName',
        //         ' ',
        //         '$creatorDetails.lastName'
        //       ]
        //     },
        //     averageRating: 1,
        //     ratingCount: 1,
        //   },
        // },
      ];

      const totalCoursesResult = await this.wishListModel.aggregate([
        ...searchQuery,
        {
          $count: 'total',
        },
      ]);

      const totalCourses = totalCoursesResult[0]?.total || 0;

      const data = await this.wishListModel.aggregate([
        ...searchQuery,
        {
          $skip: (page - 1) * limit,
        },
        {
          $limit: limit,
        },
         {
          $project: {
            'courseDetails._id': 1,
            'courseDetails.title': 1,
            'courseDetails.description': 1,
            'courseDetails.courseImg': 1,
            'courseDetails.createdBy': 1,
            // creator info
            // 👇 ADD THIS
            instructorName: {
              $concat: [
                '$creatorDetails.firstName',
                ' ',
                '$creatorDetails.lastName'
              ]
            },
            averageRating: 1,
            ratingCount: 1,
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
      // .find({ userId })
      // .populate('courseId');
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }
}

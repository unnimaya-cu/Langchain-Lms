import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RatingReview } from './schema/ratingreview.schema';
import { RatingReviewDto } from './dto/ratingreview.dto';
import { Types } from 'mongoose';
import { FeedbackDto } from './dto/feedback.dto';
import { FeedbackStatus } from 'src/common/enum/feeback.enum';
import { VideoComment } from 'src/modules/chapter-video-comments/schema/chaptervideo-comment.schema';
import { CourseDiscussion } from 'src/modules/course-discussion/schema/course-discussion.schema';
import { User } from '../schema/user.schema';

@Injectable()
export class RatingreviewService {
  constructor(
    @InjectModel(RatingReview.name)
    private readonly ratingReviewModel: Model<RatingReview>,
    @InjectModel(VideoComment.name)
    private readonly videoCommentModel: Model<VideoComment>,
    @InjectModel(CourseDiscussion.name)
    private readonly courseDiscussionModel: Model<CourseDiscussion>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) { }

  // async createRatingReview(dto: RatingReviewDto) {
  //   try {
  //     const ratingCourse = await new this.ratingReviewModel(dto).save();
  //     return { data: ratingCourse, err: null };
  //   } catch (err) {
  //     return { data: null, err: err };
  //   }
  // }

  async updateRatingReview(dto: RatingReviewDto, userid) {
    try {
      const courseObjectId = dto.courseId;
      const userObjectId = userid;
      const existingRating = await this.ratingReviewModel.findOne({
        courseId: courseObjectId,
        userId: userObjectId,
      });

      // console.log("ratingdatta",existingRating);

      if (existingRating) {
        existingRating.rating = dto.rating;
        existingRating.review = dto.review;
        await existingRating.save();
        return { data: existingRating, err: null };
      } else {
        const newReview = await new this.ratingReviewModel(dto).save();
        return { data: newReview, err: null };
      }
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getRatingReview(courseid: string) {
    // try {
    const courseObjectId = new Types.ObjectId(courseid);
    const data = await this.ratingReviewModel.aggregate([
      {
        $match: { courseId: courseObjectId },
      },
      {
        $group: {
          _id: '$courseId',
          totalRating: { $sum: '$rating' },
          averageRating: { $avg: '$rating' },
          ratingCount: { $count: {} },
        },
      },
    ]);
    if (data.length === 0) {
      return { totalRating: 0, averageRating: 0, ratingCount: 0 };
    }
    return { data: data[0] };
    // }
    //  catch (err) {
    //   return { data: null, err: err };
    // }
  }

  async getRatingReviewList(
  page = 1,
  search = '',
  limit = 7,
) {
    try {
      const skip = (page - 1) * limit;

      const pipeline: any[] = [
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
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course',
          },
        },
        { $unwind: '$course' },
      ];

      // 🔍 Add match if there's a search keyword
      if (search && search.trim() !== '') {
        pipeline.push({
          $match: {
            'course.title': { $regex: search.trim(), $options: 'i' }, // case-insensitive match
          },
        });
      }

      pipeline.push(
        {
          $project: {
            'user.password': 0,
            'user.resetToken': 0,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            paginatedResults: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        }
      );

      const result = await this.ratingReviewModel.aggregate(pipeline);

      const reviewList = result[0]?.paginatedResults ?? [];
      const totalCount = result[0]?.totalCount?.[0]?.count ?? 0;

      return {
        reviewList,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      };
    } catch (err) {
      return { data: null, totalCount: 0, err };
    }
}

  // get all ratingcount of course
  async getCourseRatingDistributionPercentage(courseid: string) {
    const courseObjectId = new Types.ObjectId(courseid);
    try {
      const dataCounts = await this.ratingReviewModel.aggregate([
        { $match: { courseId: courseObjectId } },
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
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
            reviews: {
              $push: {
                review: '$review',
                createdAt: '$createdAt',
                userName: {
                  $concat: ['$user.firstName', ' ', '$user.lastName'],
                },
                profileImg:{
                  $ifNull:['$user.profileImg', null]
                }
              },
            },
          },
        },
      ]);
      const totalRatings = dataCounts.reduce(
        (sum, item) => sum + item.count,
        0,
      );
      const distribution = [1, 2, 3, 4, 5].map((rating) => {
        const matched = dataCounts.find((r) => r._id === rating);
        const count = matched ? matched.count : 0;
        const reviews=matched ? matched.reviews :[];
        const createdAt=matched ? matched.createdAt :[];
        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
        return {
          rating,
          count,
          percentage: +percentage,
          reviews,
          createdAt
        };
      });
      return { data: distribution, err: null };
    } catch (err) {
      return { data: null, err };
    }
  }

  
  async getAllFeedbacks(dto: FeedbackDto, userId: string) {
    try{
      // const repliedCount = await this.ratingReviewModel.countDocuments({status: FeedbackStatus.REPLIED})
      // const awaitingReplyCount = await this.ratingReviewModel.countDocuments({status: FeedbackStatus.AWAITING})
      // const flaggedCount = await this.ratingReviewModel.countDocuments({status: FeedbackStatus.FLAGGED})
      // const allCount = await this.ratingReviewModel.countDocuments()
      const tutor = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(tutor && ((tutor.roleId as any).roleName === 'admin' ||(tutor.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const statusCounts = await this.ratingReviewModel.aggregate([
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
        ...(isSuperAdmin ? [] : [{$match:{'courseDetails.createdBy': new Types.ObjectId(userId)}}]),
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const repliedCount =
        statusCounts.find(x => x._id === FeedbackStatus.REPLIED)?.count || 0;

      const awaitingReplyCount =
        statusCounts.find(x => x._id === FeedbackStatus.AWAITING)?.count || 0;

      const flaggedCount =
        statusCounts.find(x => x._id === FeedbackStatus.FLAGGED)?.count || 0;

      const allCount =
        statusCounts.reduce((sum, item) => sum + item.count, 0);

      let allComments = 0;
      let allDiscussions = 0;

      if (isSuperAdmin) {
        allComments = await this.videoCommentModel.countDocuments();
        allDiscussions = await this.courseDiscussionModel.countDocuments();
      } else {
        const [commentsCount] = await this.videoCommentModel.aggregate([
          {
            $lookup:{
              from:'videochapters',
              localField:'videoId',
              foreignField:'_id',
              as:'videoChapters'
            }
          },
          {
            $unwind:'$videoChapters'
          },
          {
            $lookup:{
              from:'chapters',
              localField:'videoChapters._id',
              foreignField:'videoId',
              as:'chapters'
            }
          },
          {
            $unwind:'$chapters'
          },
          {
            $lookup:{
              from:'coursemodules',
              localField:'chapters.moduleId',
              foreignField:'_id',
              as:'courseModules'
            }
          },
          {
            $unwind:'$courseModules'
          },
          {
            $lookup:{
              from:'courses',
              localField:'courseModules.courseId',
              foreignField:'_id',
              as:'courseDetails'
            }
          },
          {
            $unwind:'$courseDetails'
          },
          {
            $match: {
              'courseDetails.createdBy': new Types.ObjectId(userId),
            },
          },
          {
            $count: 'count',
          },
        ]);

        allComments = commentsCount?.count || 0;

        const [discussionsCount] = await this.courseDiscussionModel.aggregate([
          {
            $lookup: {
              from: 'courses',
              localField: 'courseId',
              foreignField: '_id',
              as: 'course',
            },
          },
          { $unwind: '$course' },
          {
            $match: {
              'course.createdBy': new Types.ObjectId(userId),
            },
          },
          {
            $count: 'count',
          },
        ]);

        allDiscussions = discussionsCount?.count || 0;
      }

      // const allComments = await this.videoCommentModel.countDocuments({
      //   // parentId:{$ne:null}
      // })
      // const allDiscussions = await this.courseDiscussionModel.countDocuments({
      //   // parentId:{$ne:null}
      // })
      
      const searchQuery:any = [
        ...(dto?.tab && dto.tab !== 'all'
          ? [{$match:{status:dto.tab}}]
          : []
        ),
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
        ...(isSuperAdmin ? [] : [{$match:{'courseDetails.createdBy': new Types.ObjectId(userId)}}]),
        {
          $lookup:{
            from:'users',
            localField:'userId',
            foreignField:'_id',
            as:'userDetails'
          }
        },
        {
          $unwind:'$userDetails'
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
          $addFields: {
            courseTitleLower: {
              $toLower: '$courseDetails.title'
            }
          }
        },
        {
          $addFields: {
            nameLower: {
              $toLower: {
                $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName']
              }
            }
          }
        }
      ]

      if(dto?.courseId !== 'all') {
        searchQuery.push({
          $match:{
            courseId:new Types.ObjectId(dto.courseId)
          }
        })
      }

      if(dto?.categoryId !== 'all') {
        searchQuery.push({
          $match:{
            'categoryDetails._id':new Types.ObjectId(dto.categoryId)
          }
        })
      }

      if(dto?.rating !== 'all') {
        searchQuery.push({
          $match:{
            rating: Number(dto.rating)
          }
        })
      }

      if(dto?.search) {
        searchQuery.push({
          $match:{
            $or:[
              {'userDetails.firstName': {$regex: dto.search,$options: 'i'}},
              {'userDetails.lastName': {$regex: dto.search,$options: 'i'}},
              {'courseDetails.title': {$regex: dto.search,$options: 'i'}},
              {review: {$regex: dto.search,$options: 'i'}},
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
            ]
          }
        })
      }

      let sortStage:any = {createdAt:-1}

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'newestfirst':
            sortStage = {createdAt:-1}
            break;
          case 'oldestfirst':
            sortStage = {createdAt:1}
            break;
          case 'highestrating':
            sortStage = {rating:-1}
            break;
          case 'lowestrating':
            sortStage = {rating:1}
            break;
          case 'coursenameasc':
            sortStage = {courseTitleLower:1}
            break;
          case 'coursenamedesc':
            sortStage = {courseTitleLower:-1}
            break;
          case 'studentnameasc':
            sortStage = {nameLower:1, createdAt:-1}
            break;
          case 'studentnamedesc':
            sortStage = {nameLower:-1, createdAt:-1}
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

              searchQuery.push({
                $match: {
                  createdAt: {
                    $gte: startDate,
                    $lte: endDate,
                  },
                },
              });
              sortStage = {createdAt: -1};
            }
            break;

          default:
            sortStage = {createdAt: -1};
        }
      }

      const totalFeedbacksResult = await this.ratingReviewModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalFeedbacks = totalFeedbacksResult[0]?.total || 0

      const data = await this.ratingReviewModel.aggregate([
        ...searchQuery,
        {$sort: sortStage},
        {$skip:(dto.page - 1) * dto.limit},
        {$limit: dto.limit},
        {
          $project:{
            courseName: '$courseDetails.title',
            coverImg: '$courseDetails.coverImg',
            courseImg: '$courseDetails.courseImg',
            categoryName: '$categoryDetails.name',
            courseCode: '$courseDetails.courseCode',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            profileImg:{
              $ifNull:['$userDetails.profileImg', null]
            },
            email: '$userDetails.email',
            review: {
              $ifNull:['$review', null]
            },
            rating: 1,
            submittedOn: '$createdAt',
            status:1
          }
        }
      ])

      return {data:{
        data,
        totalFeedbacks,
        totalPages: Math.ceil(totalFeedbacks/dto.limit),
        currentPage: dto.page,
        allCount,
        repliedCount,
        awaitingReplyCount,
        flaggedCount,
        allComments,
        allDiscussions
      }, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async viewFeedback(feedbackId:string) {
    try{
      const feedback = await this.ratingReviewModel.findById(new Types.ObjectId(feedbackId))
      .populate({
        path:'userId',
        select: 'firstName lastName email profileImg'
      })
      .populate({
        path:'courseId',
        select: 'title courseCode coverImg courseImg',
        populate:{
          path: 'categoryId',
          select:'name'
        }
      })

      if(!feedback) {
        return {data:null, err:'Feedback not found.'}
      }

      const course = feedback.courseId as any
      const user = feedback.userId as any

      const data = {
        _id: feedback._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImg: user.profileImg || null,
        email: user.email,
        courseName:course.title,
        courseCode: course.courseCode,
        coverImg: course.coverImg,
        courseImg: course.courseImg,
        module:1,
        lecture:2,
        categoryName: (course.categoryId as any).name,
        rating: feedback.rating,
        submittedOn: feedback.createdAt,
        status: feedback.status,
        feedback: feedback.review || null,
        reply: feedback.reply || null,
        repliedOn: feedback.repliedOn || null,
        previousState: feedback.previousState || null
      }
      return {data: data, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async replyFeedback(feedbackId:string, reply:string) {
    try{
      if(!reply) {
        return {data:null, err:'Reply is required.'}
      }

      const feedback = await this.ratingReviewModel.findById(new Types.ObjectId(feedbackId))

      if(!feedback) {
        return {data:null, err:'Feedback not found.'}
      }

      if(feedback.status === FeedbackStatus.FLAGGED) {
        return {data:null, err:'Reply cannot be given for flagged feedback.'}
      }

      if(reply) {
        feedback.reply = reply
        feedback.repliedOn = new Date()
        feedback.status = FeedbackStatus.REPLIED
        await feedback.save()
      }
      
      return {data: feedback, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async flagFeedback(feedbackId:string) {
    try{

      const feedback = await this.ratingReviewModel.findById(new Types.ObjectId(feedbackId))

      if(!feedback) {
        return {data:null, err:'Feedback not found.'}
      }

      if(feedback.status === FeedbackStatus.FLAGGED) {
        return {data:null, err:'Feedback has already been flagged.'}
      }

      feedback.previousState = feedback.status
      feedback.status = FeedbackStatus.FLAGGED
      await feedback.save()
      
      return {data: feedback, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }

  async unflagFeedback(feedbackId:string) {
    try{

      const feedback = await this.ratingReviewModel.findById(new Types.ObjectId(feedbackId))

      if(!feedback) {
        return {data:null, err:'Feedback not found.'}
      }

      if(feedback.status !== FeedbackStatus.FLAGGED) {
        return {data:null, err:'Feedback has already been unflagged.'}
      }

      feedback.status = feedback?.previousState || null
      feedback.previousState = null
      await feedback.save()
      
      return {data: feedback, err: null}
    }catch(error) {
      console.error(error)
      return {data: null, err: error}
    }
  }
}

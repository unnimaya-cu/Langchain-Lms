import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { VideoComment } from './schema/chaptervideo-comment.schema';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  ReplyCommentDto,
  VideoCommentDto,
} from './dto/chaptervideo-comment.dto';
import { Server } from 'socket.io';
import { CommentDto } from './dto/comment.dto';
import { CommentStatus } from 'src/common/enum/comment.enum';
import { User } from '../user/schema/user.schema';
// import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ChapterVideoCommentService {
  server: Server;
  constructor(
    @InjectModel(VideoComment.name)
    private readonly videoCommentModel: Model<VideoComment>,
    // private readonly notificationservice:NotificationService
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async createComment(dto: VideoCommentDto, userid: string) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const newComment = await this.videoCommentModel.create({
        ...dto,
        userId: userObjectId,
        upVotes: [],
        downVotes: [],
        parentId: null,
        version: 0,
      });
      // const newComment = await new this.videoCommentModel({
      //   ...dto,
      //   userId: userObjectId,
      // }).save();
      return newComment;
    } catch (err) {
      console.error('Database Error:', err);
      throw new InternalServerErrorException('Could not save comment');
    }
  }

  async getCommentsByVideoId(videoid: string) {
    try {
      const getComments = await this.videoCommentModel
        .find({ videoId: videoid, parentId: null })
        .populate('userId');
      const commentsWithUpvoteCount = getComments.map((item) => ({
        // ...item,
        upvotesCount: item.upVotes?.length || 0, // Count upvotes
        downvotesCount: item.downVotes?.length || 0, // Count downvotes
        comment: item.comment,
        _id: item._id,
        userId: item?.userId,
        videoId: item?.videoId,
        createdAt: item?.createdAt,
      }));

      return commentsWithUpvoteCount;
    } catch (err) {
      throw new InternalServerErrorException('Could not fetch comments');
    }
  }
  // upvote comment
  async upVoteComment(commentId: string, userId: string) {
    // const commentObjectId = new Types.ObjectId(commentId);
    const userObjectId = new Types.ObjectId(userId);
    try {
      const comment = await this.videoCommentModel.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }
      // const hasUpvoted = comment.upVotes.includes(userObjectId);
      const hasUpvoted = comment.upVotes.some((id) => id.toString() === userId);
      if (hasUpvoted) {
        comment.upVotes = comment.upVotes.filter(
          (id) => id.toString() !== userId,
        );
        // console.log('remove', comment);
      } else {
        comment.upVotes.push(userObjectId);
        comment.downVotes = comment.downVotes.filter(
          (id) => id.toString() !== userId,
        );
      }
      await comment.save();

      return comment;
    } catch (err) {
      console.log('err', err);
    }
  }

  // downvote comment
  async downVoteComment(commentId: string, userId: string) {
    // const commentObjectId = new Types.ObjectId(commentId);
    const userObjectId = new Types.ObjectId(userId);
    try {
      const comment = await this.videoCommentModel.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      // const hasDownvoted = comment.downVotes.includes(userObjectId);
      const hasDownvoted = comment.downVotes.some((id) => id.toString() === userId);
      if (hasDownvoted) {
        comment.downVotes = comment.downVotes.filter(
          (id) => id.toString() !== userId,
        );
        // console.log("remove",comment);
      } else {
        comment.downVotes.push(userObjectId);
        comment.upVotes = comment.upVotes.filter(
          (id) => id.toString() !== userId,
        );
      }
      await comment.save();

      return comment;
    } catch (err) {
      console.log('err', err);
    }
  }

  async replyComment(dto: ReplyCommentDto, userid: string) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const replyData = await new this.videoCommentModel({
        ...dto,
        userId: userObjectId,
      }).save();
      // console.log('replydataa', replyData);

      const parentComment = await this.videoCommentModel
        .findById(replyData?.parentId)
        .populate('userId');
      const originalAuthorId = parentComment.userId._id;
      // await this.notificationservice.notifyCommentReply(replyData._id, userid);

      // await this.notificationGateway.sendReplyCommentNotification(
      //   replyData._id.toString(),
      //   userid,
      // );
      // console.log("parentcoment",parentComment);

      const replyWithOriginalId = {
        ...replyData.toObject(),
        originalId: originalAuthorId,
      };

      return replyWithOriginalId;
    } catch (err) {
      console.log('err', err);
    }
  }

  async getReplies(parentId: string) {
    const parentObjectId = new Types.ObjectId(parentId);
    try {
      const data = await this.videoCommentModel
        .find({ parentId: parentObjectId })
        .populate('userId');
      return data;
    } catch (err) {
      console.log('err', err);
    }
  }

  // async getRepliesByCommentId(commentId: string) {
  //   try {
  //     const replies = await this.videoCommentModel
  //       .find({ parentCommentId: commentId ,replies:null})
  //       .populate('userId', 'name')
  //       .lean();

  //     return replies.map((reply) => ({
  //       ...reply,
  //       upvotesCount: reply.upVotes?.length || 0,
  //       downvotesCount: reply.downVotes?.length || 0,
  //     }));
  //   } catch (err) {
  //     console.error('Error fetching replies:', err);
  //     return { data: null, err };
  //   }
  // }

  async getAllComments(dto: CommentDto, userId: string) {
    try{

      const tutor = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(tutor && ((tutor.roleId as any).roleName === 'admin' ||(tutor.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery: any= [
        ...(dto?.tab && dto.tab !== 'all' 
          ? [{$match:{status:dto.tab}}]
          : []
        ),
        // {
        //   $match:{parentId:{$ne:null}}
        // },
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
        ...(isSuperAdmin ? [] : [{$match:{'courseDetails.createdBy': new Types.ObjectId(userId)}}]),
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
          $addFields: {
            courseTitleLower: {
              $toLower: '$courseDetails.title'
            },
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
            'courseDetails._id':new Types.ObjectId(dto.courseId)
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

      if(dto?.search) {
        searchQuery.push({
          $match:{
            $or:[
              {'userDetails.firstName': {$regex: dto.search,$options: 'i'}},
              {'userDetails.lastName': {$regex: dto.search,$options: 'i'}},
              {'courseDetails.title': {$regex: dto.search,$options: 'i'}},
              {comment: {$regex: dto.search,$options: 'i'}},
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

      const totalCommentsResult = await this.videoCommentModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalComments = totalCommentsResult[0]?.total || 0

      const data = await this.videoCommentModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:(dto.page - 1) * dto.limit},
        {$limit: dto.limit},
        {
          $project:{
            courseName: '$courseDetails.title',
            courseCode: '$courseDetails.courseCode',
            coverImg: '$courseDetails.coverImg',
            courseImg: '$courseDetails.courseImg',
            categoryName: '$categoryDetails.name',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            profileImg: {
              $ifNull:['$userDetails.profileImg', null]
            },
            email: '$userDetails.email',
            comment: 1,
            submittedOn: '$createdAt',
            status: 1
          }
        }
      ])

      const countsResult = await this.videoCommentModel.aggregate([
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
        ...(isSuperAdmin ? [] : [{$match:{'courseDetails.createdBy': new Types.ObjectId(userId)}}]),
        {
          $facet: {
            allCount: [
              { $count: "count" }
            ],
            repliedCount: [
              { $match: { status: CommentStatus.REPLIED } },
              { $count: "count" }
            ],
            awaitingReplyCount: [
              { $match: { status: CommentStatus.AWAITING } },
              { $count: "count" }
            ],
            flaggedCount: [
              { $match: { status: CommentStatus.FLAGGED } },
              { $count: "count" }
            ]
          }
        }
      ]);

      const counts = countsResult[0];

      const allCount = counts.allCount[0]?.count || 0;
      const repliedCount = counts.repliedCount[0]?.count || 0;
      const awaitingReplyCount = counts.awaitingReplyCount[0]?.count || 0;
      const flaggedCount = counts.flaggedCount[0]?.count || 0;

      // const allCount = await this.videoCommentModel.countDocuments({
      //   // parentId:{$ne:null}
      // })
      // const repliedCount = await this.videoCommentModel.countDocuments({status: CommentStatus.REPLIED})
      // const awaitingReplyCount = await this.videoCommentModel.countDocuments({status: CommentStatus.AWAITING})
      // const flaggedCount = await this.videoCommentModel.countDocuments({status: CommentStatus.FLAGGED})

      return {data:{
        data,
        totalComments,
        totalPages:Math.ceil(totalComments/dto.limit),
        currentPage: dto.page,
        allCount,
        repliedCount,
        awaitingReplyCount,
        flaggedCount
      }, err:null}
    }catch(error) {
      console.error(error)
      return {data:null, err: error}
    }
  }

  async viewComment(commentId: string) {
    try {
      const searchQuery: any= [
        {
          $match:{_id:new Types.ObjectId(commentId)}
        },
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
            from:'users',
            localField:'userId',
            foreignField:'_id',
            as:'userDetails'
          }
        }, 
        {
          $unwind:'$userDetails'
        }
      ]
      const comment = await this.videoCommentModel.aggregate([
        ...searchQuery,{
          $project:{
            firstName:'$userDetails.firstName',
            lastName:'$userDetails.lastName',
            profileImg:'$userDetails.profileImg',
            email:'$userDetails.email',
            courseName:'$courseDetails.title',
            coverImg:'$courseDetails.coverImg',
            courseImg:'$courseDetails.courseImg',
            module:'$courseModules.title',
            chapter:'$videoChapters.title',
            categoryName:'$categoryDetails.name',
            courseCode:'$courseDetails.courseCode',
            submittedOn:'$createdAt',
            status:1,
            comment:1,
            reply:{
              $ifNull:['$reply', null]
            },
            repliedOn:{
              $ifNull:['$repliedOn', null]
            },
            previousState:{
              $ifNull:['$previousState', null]
            }
          }
        }
      ])

      if(!comment[0]) {
        return {data:null, err:'Comment not found.'}
      }

      return {data:comment[0], err:null}
    } catch (error) {
      console.error(error)
      return {data:null, err: error}
    }
  }

  async replyToComment(commentId: string, reply: string) {
    try {
      if(!reply) {
        return {data:null, err:'Reply is required.'}
      }

      const comment = await this.videoCommentModel.findById(new Types.ObjectId(commentId))

      if(!comment) {
        return {data:null, err:'Comment not found.'}
      }

      if(comment.status === CommentStatus.FLAGGED) {
        return {data:null, err:'Reply cannot be given for flagged comment.'}
      }

      comment.reply = reply
      comment.status = CommentStatus.REPLIED
      comment.repliedOn = new Date()
      
      await comment.save()
      return {data: comment, err:null}
    } catch (error) {
      console.error(error)
      return {data:null, err: error}
    }
  }

  async flagComment(commentId: string) {
    try {
      const comment = await this.videoCommentModel.findById(new Types.ObjectId(commentId))

      if(!comment) {
        return {data:null, err:'Comment not found.'}
      }

      if(comment.status === CommentStatus.FLAGGED) {
        return {data:null, err:'Comment is already flagged.'}
      }

      comment.previousState = comment.status
      comment.status = CommentStatus.FLAGGED
      
      await comment.save()
      return {data: comment, err:null}
    } catch (error) {
      console.error(error)
      return {data:null, err: error}
    }
  }

  async unflagComment(commentId: string) {
    try {
      const comment = await this.videoCommentModel.findById(new Types.ObjectId(commentId))

      if(!comment) {
        return {data:null, err:'Comment not found.'}
      }

      if(comment.status !== CommentStatus.FLAGGED) {
        return {data:null, err:'Comment has already been unflagged.'}
      }

      comment.status = comment.previousState
      comment.previousState = null
      
      await comment.save()
      return {data: comment, err:null}
    } catch (error) {
      console.error(error)
      return {data:null, err: error}
    }
  }
}

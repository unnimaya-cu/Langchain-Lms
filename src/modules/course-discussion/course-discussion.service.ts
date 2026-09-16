import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CourseDiscussion } from './schema/course-discussion.schema';
import {
  CourseDiscussionDto,
  ReplyDiscussionDto,
  QueryDiscussionDto,
} from './dto/course-discussion.dto';
import { CommentStatus } from 'src/common/enum/comment.enum';
import { User } from '../user/schema/user.schema';

@Injectable()
export class CourseDiscussionService {
  constructor(
    @InjectModel(CourseDiscussion.name)
    private readonly courseDiscussionModel: Model<CourseDiscussion>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /** Escapes regex metacharacters so user input is matched literally. */
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async createDiscussion(dto: CourseDiscussionDto, userid: string) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const newDiscussion = await this.courseDiscussionModel.create({
        courseId: new Types.ObjectId(dto.courseId),
        comment: dto.comment,
        attachments: dto.attachments || [],
        userId: userObjectId,
        upVotes: [],
        downVotes: [],
        parentId: null,
      });
      return newDiscussion;
    } catch (err) {
      console.error('Database Error:', err);
      throw new InternalServerErrorException('Could not save discussion post');
    }
  }

  async getDiscussionsByCourseId(courseId: string) {
    try {
      const discussions = await this.courseDiscussionModel
        .find({ courseId: new Types.ObjectId(courseId), parentId: null })
        .populate('userId');

      // Fetch reply counts for all threads in a single aggregation (avoids N+1)
      const rootIds = discussions.map((item) => item._id);
      const replyCounts = await this.courseDiscussionModel.aggregate([
        { $match: { parentId: { $in: rootIds } } },
        { $group: { _id: '$parentId', count: { $sum: 1 } } },
      ]);
      const replyCountMap = new Map<string, number>(
        replyCounts.map((r) => [r._id.toString(), r.count]),
      );

      const discussionsWithCount = discussions.map((item) => ({
        _id: item._id,
        comment: item.comment,
        userId: item.userId,
        courseId: item.courseId,
        upvotesCount: item.upVotes?.length || 0,
        downvotesCount: item.downVotes?.length || 0,
        createdAt: item.createdAt,
        repliesCount: replyCountMap.get(item._id.toString()) || 0,
        attachments: item.attachments || [],
      }));

      return discussionsWithCount;
    } catch (err) {
      throw new InternalServerErrorException('Could not fetch discussions');
    }
  }

  async upVoteDiscussion(discussionId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    try {
      // Atomic toggle: if already upvoted remove it, otherwise add the upvote
      // and clear any existing downvote. Both branches evaluate against the
      // original document, preventing lost updates from concurrent votes.
      const updatedPost = await this.courseDiscussionModel.findByIdAndUpdate(
        new Types.ObjectId(discussionId),
        [
          {
            $set: {
              upVotes: {
                $cond: [
                  { $in: [userObjectId, '$upVotes'] },
                  { $setDifference: ['$upVotes', [userObjectId]] },
                  { $setUnion: ['$upVotes', [userObjectId]] },
                ],
              },
              downVotes: {
                $cond: [
                  { $in: [userObjectId, '$upVotes'] },
                  '$downVotes',
                  { $setDifference: ['$downVotes', [userObjectId]] },
                ],
              },
            },
          },
        ],
        { new: true },
      );

      if (!updatedPost) {
        throw new Error('Discussion post not found');
      }
      return updatedPost;
    } catch (err) {
      console.error('Error upvoting discussion:', err);
    }
  }

  async downVoteDiscussion(discussionId: string, userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    try {
      // Atomic toggle mirroring upVoteDiscussion for the downvote array.
      const updatedPost = await this.courseDiscussionModel.findByIdAndUpdate(
        new Types.ObjectId(discussionId),
        [
          {
            $set: {
              downVotes: {
                $cond: [
                  { $in: [userObjectId, '$downVotes'] },
                  { $setDifference: ['$downVotes', [userObjectId]] },
                  { $setUnion: ['$downVotes', [userObjectId]] },
                ],
              },
              upVotes: {
                $cond: [
                  { $in: [userObjectId, '$downVotes'] },
                  '$upVotes',
                  { $setDifference: ['$upVotes', [userObjectId]] },
                ],
              },
            },
          },
        ],
        { new: true },
      );

      if (!updatedPost) {
        throw new Error('Discussion post not found');
      }
      return updatedPost;
    } catch (err) {
      console.error('Error downvoting discussion:', err);
    }
  }

  async replyDiscussion(dto: ReplyDiscussionDto, userid: string) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const replyData = await new this.courseDiscussionModel({
        parentId: new Types.ObjectId(dto.parentId),
        courseId: new Types.ObjectId(dto.courseId),
        comment: dto.comment,
        attachments: dto.attachments || [],
        userId: userObjectId,
      }).save();

      const parentPost = await this.courseDiscussionModel
        .findById(replyData.parentId)
        .populate('userId');

      const originalAuthorId = parentPost?.userId?._id;

      return {
        ...replyData.toObject(),
        originalId: originalAuthorId,
      };
    } catch (err) {
      console.error('Error saving discussion reply:', err);
    }
  }

  async getReplies(parentId: string) {
    try {
      return await this.courseDiscussionModel
        .find({ parentId: new Types.ObjectId(parentId) })
        .populate('userId');
    } catch (err) {
      console.error('Error fetching replies:', err);
    }
  }

  async getAllDiscussionsAdmin(dto: QueryDiscussionDto, userId: string) {
    try {
      const tutor = await this.userModel.findById(new Types.ObjectId(userId))
      .populate('roleId')
      .select('roleId')

      let isSuperAdmin = false

      if(tutor && ((tutor.roleId as any).roleName === 'admin' ||(tutor.roleId as any).roleName === 'super admin')) {
        isSuperAdmin = true
      }

      const searchQuery: any[] = [
        ...(dto?.tab && dto.tab !== 'all'
          ? [{ $match: { status: dto.tab } }]
          : []
        ),
        // { $match: { parentId: null } }, // List root discussion threads
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        { $unwind: '$courseDetails' },
        ...(isSuperAdmin ? [] : [{$match:{'courseDetails.createdBy': new Types.ObjectId(userId)}}]),
        {
          $lookup: {
            from: 'categories',
            localField: 'courseDetails.categoryId',
            foreignField: '_id',
            as: 'categoryDetails',
          },
        },
        { $unwind: '$categoryDetails' },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
        {
          $addFields: {
            courseTitleLower: { $toLower: '$courseDetails.title' },
            nameLower: {
              $toLower: {
                $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'],
              },
            },
          },
        },
      ];

      if (dto?.courseId !== 'all') {
        searchQuery.push({
          $match: { 'courseDetails._id': new Types.ObjectId(dto.courseId) },
        });
      }

      if (dto?.categoryId !== 'all') {
        searchQuery.push({
          $match: { 'categoryDetails._id': new Types.ObjectId(dto.categoryId) },
        });
      }

      if (dto?.search) {
        const safeSearch = this.escapeRegex(dto.search);
        searchQuery.push({
          $match: {
            $or: [
              { 'userDetails.firstName': { $regex: safeSearch, $options: 'i' } },
              { 'userDetails.lastName': { $regex: safeSearch, $options: 'i' } },
              { 'courseDetails.title': { $regex: safeSearch, $options: 'i' } },
              { comment: { $regex: safeSearch, $options: 'i' } },
              {
                $expr: {
                  $regexMatch: {
                    input: {
                      $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'],
                    },
                    regex: safeSearch,
                    options: 'i',
                  },
                },
              },
            ],
          },
        });
      }

      // Date-range filter is applied independently of the sort option, since the
      // client sends startDate/endDate alongside a regular sort (e.g. newestFirst).
      if (dto?.startDate && dto?.endDate) {
        const startDate = new Date(dto.startDate);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(dto.endDate);
        endDate.setHours(23, 59, 59, 999);

        searchQuery.push({
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        });
      }

      let sortStage: any = { createdAt: -1 };

      if (dto?.sortBy) {
        switch (dto.sortBy.toLowerCase()) {
          case 'newestfirst':
            sortStage = { createdAt: -1 };
            break;
          case 'oldestfirst':
            sortStage = { createdAt: 1 };
            break;
          case 'coursenameasc':
            sortStage = { courseTitleLower: 1 };
            break;
          case 'coursenamedesc':
            sortStage = { courseTitleLower: -1 };
            break;
          case 'studentnameasc':
            sortStage = { nameLower: 1, createdAt: -1 };
            break;
          case 'studentnamedesc':
            sortStage = { nameLower: -1, createdAt: -1 };
            break;
          case 'customrange':
            // Date range is already applied above; only the sort order matters here.
            sortStage = { createdAt: -1 };
            break;
          default:
            sortStage = { createdAt: -1 };
        }
      }

      const totalResult = await this.courseDiscussionModel.aggregate([
        ...searchQuery,
        { $count: 'total' },
      ]);

      const totalDiscussions = totalResult[0]?.total || 0;

      const data = await this.courseDiscussionModel.aggregate([
        ...searchQuery,
        { $sort: sortStage },
        { $skip: (dto.page - 1) * dto.limit },
        { $limit: dto.limit },
        {
          $lookup: {
            from: 'coursediscussions',
            localField: '_id',
            foreignField: 'parentId',
            as: 'replies',
          },
        },
        {
          $project: {
            courseName: '$courseDetails.title',
            courseCode: '$courseDetails.courseCode',
            coverImg: '$courseDetails.coverImg',
            courseImg: '$courseDetails.courseImg',
            categoryName: '$categoryDetails.name',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            profileImg: { $ifNull: ['$userDetails.profileImg', null] },
            email: '$userDetails.email',
            comment: 1,
            submittedOn: '$createdAt',
            status: 1,
            attachments: 1,
            repliesCount: { $size: '$replies' },
          },
        },
      ]);

      const countsResult = await this.courseDiscussionModel.aggregate([
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'courseDetails',
          },
        },
        { $unwind: '$courseDetails' },
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

      // const allCount = await this.courseDiscussionModel.countDocuments({ 
      //   // parentId: null 
      // });
      // const repliedCount = await this.courseDiscussionModel.countDocuments({ status: CommentStatus.REPLIED, 
      //   // parentId: null 
      // });
      // const awaitingReplyCount = await this.courseDiscussionModel.countDocuments({ status: CommentStatus.AWAITING, 
      //   // parentId: null 
      // });
      // const flaggedCount = await this.courseDiscussionModel.countDocuments({ status: CommentStatus.FLAGGED, 
      //   // parentId: null 
      // });

      return {
        data: {
          data,
          totalComments: totalDiscussions, // Match format for Admin table
          totalPages: Math.ceil(totalDiscussions / dto.limit),
          currentPage: dto.page,
          allCount,
          repliedCount,
          awaitingReplyCount,
          flaggedCount,
        },
        err: null,
      };
    } catch (error) {
      console.error('Error fetching admin course discussions:', error);
      return { data: null, err: error };
    }
  }

  async viewDiscussion(id: string) {
    try {
      const discussion = await this.courseDiscussionModel
        .findById(new Types.ObjectId(id))
        .populate('userId')
        .populate({
          path: 'courseId',
          populate: { path: 'categoryId' },
        });

      if (!discussion) {
        return { data: null, err: 'Discussion post not found.' };
      }

      const courseDetails = discussion.courseId as any;
      const categoryDetails = courseDetails?.categoryId as any;
      const userDetails = discussion.userId as any;

      const formatted = {
        _id: discussion._id,
        firstName: userDetails?.firstName,
        lastName: userDetails?.lastName,
        profileImg: userDetails?.profileImg,
        email: userDetails?.email,
        courseName: courseDetails?.title,
        coverImg: courseDetails?.coverImg,
        courseImg: courseDetails?.courseImg,
        module: 'General Course Q&A',
        chapter: 'N/A',
        categoryName: categoryDetails?.name,
        courseCode: courseDetails?.courseCode,
        submittedOn: discussion.createdAt,
        status: discussion.status,
        comment: discussion.comment,
        attachments: discussion.attachments || [],
        reply: discussion.reply || null,
        repliedOn: discussion.repliedOn || null,
        previousState: discussion.previousState || null,
      };

      return { data: formatted, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async replyToDiscussion(discussionId: string, replyText: string) {
    try {
      if (!replyText) {
        return { data: null, err: 'Reply text is required.' };
      }

      const post = await this.courseDiscussionModel.findById(new Types.ObjectId(discussionId));
      if (!post) {
        return { data: null, err: 'Discussion post not found.' };
      }

      if (post.status === CommentStatus.FLAGGED) {
        return { data: null, err: 'Reply cannot be given for flagged discussion.' };
      }

      post.reply = replyText;
      post.status = CommentStatus.REPLIED;
      post.repliedOn = new Date();

      await post.save();
      return { data: post, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async flagDiscussion(discussionId: string) {
    try {
      const post = await this.courseDiscussionModel.findById(new Types.ObjectId(discussionId));
      if (!post) {
        return { data: null, err: 'Discussion post not found.' };
      }

      if (post.status === CommentStatus.FLAGGED) {
        return { data: null, err: 'Discussion post is already flagged.' };
      }

      post.previousState = post.status;
      post.status = CommentStatus.FLAGGED;

      await post.save();
      return { data: post, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  async unflagDiscussion(discussionId: string) {
    try {
      const post = await this.courseDiscussionModel.findById(new Types.ObjectId(discussionId));
      if (!post) {
        return { data: null, err: 'Discussion post not found.' };
      }

      if (post.status !== CommentStatus.FLAGGED) {
        return { data: null, err: 'Discussion post is not flagged.' };
      }

      post.status = post.previousState || CommentStatus.AWAITING;
      post.previousState = null;

      await post.save();
      return { data: post, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }
}

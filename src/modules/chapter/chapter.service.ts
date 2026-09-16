import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Chapter } from './schema/chapter.schema';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { ChapterDto } from './dto/chapter.dto';
import { ChaptercontentService } from '../chaptercontent/chaptercontent.service';
import { AssessmentService } from '../assessment/assessment.service';
import { ChapterVideoService } from '../chapter-video/chapter-video.service';
import { UserCourses } from '../user/userCourses/schema/usercourses.schema';
import { CourseModule } from '../coursemodule/schema/coursemodule.schema';
import { StatusType } from 'src/common/enum/status-type.enum';
import { ChapterContent } from '../chaptercontent/schema/chaptercontent.schema';
import { Assessment } from '../assessment/schema/assessment.schema';
import { VideoChapter } from '../chapter-video/schema/chapterVidoe.schema';
import { UserChapterStatusType } from 'src/common/enum/userchapterstatus-type.enum';
import { UserCourseChapter } from '../user/userCourseChapters/schema/usercourseschapters.schema';
import { CourseAssessment } from '../course-assessment/schema/course-assessment.schema';

@Injectable()
export class ChapterService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Chapter.name)
    private readonly chapterModel: Model<Chapter>,
    private chapterContentService: ChaptercontentService,
    private assessmentService: AssessmentService,
    private chapterVideoService: ChapterVideoService,
    @InjectModel(UserCourses.name)
    private readonly userCourseModel: Model<UserCourses>,
    @InjectModel(CourseModule.name)
    private readonly moduleModel: Model<CourseModule>,
    @InjectModel(ChapterContent.name)
    private readonly chapterContentModel: Model<ChapterContent>,
    @InjectModel(Assessment.name)
    private readonly assessmentModel: Model<Assessment>,
    @InjectModel(VideoChapter.name)
    private readonly videoChapterModel: Model<VideoChapter>,
    @InjectModel(UserCourseChapter.name)
    private readonly userCourseChapterModel: Model<UserCourseChapter>,
    @InjectModel(CourseAssessment.name)
    private readonly courseAssessmentModel: Model<CourseAssessment>,
  ) {}

  async createChapter(dto: ChapterDto, userId?: string) {
    const { assessment, content, video } = dto;

    try {
      let chapter;

      const chapterCount = await this.chapterModel.countDocuments({
        moduleId: dto.moduleId,
      });

      const orderNo = chapterCount + 1;

      const chaptersInModule = await this.chapterModel.find({
        moduleId: dto.moduleId,
      });

      const contentIds = chaptersInModule
        .filter((c) => c.contentId)
        .map((c) => c.contentId);

      const videoIds = chaptersInModule
        .filter((c) => c.videoId)
        .map((c) => c.videoId);

      const assessmentIds = chaptersInModule
        .filter((c) => c.assessmentId)
        .map((c) => c.assessmentId);

      const courseAssessmentIds = chaptersInModule
        .filter((c) => c.courseAssessmentId)
        .map((c) => c.courseAssessmentId);

      let title: string;

      if (dto.chapterType === 'CONTENT') title = dto.content.title;
      if (dto.chapterType === 'VIDEO') title = dto.video.title;
      if (dto.chapterType === 'ASSESSMENT') title = dto.assessment.title;
      if (dto.chapterType === 'COURSE_ASSESSMENT') {
        const courseAss = await this.courseAssessmentModel.findById(new Types.ObjectId(dto.courseAssessmentId));
        title = courseAss?.title || 'Course Assessment';
      }

      // const titleRegex = { $regex: `^${title}$`, $options: 'i' };

      const escapedTitle = (title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const titleRegex = {
        $regex: `^${escapedTitle}$`,
        $options: 'i',
      };

      const [existingContent, existingVideo, existingAssessment, existingCourseAssessment] =
        await Promise.all([
          contentIds.length
            ? this.chapterContentModel.findOne({
                _id: { $in: contentIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,

          videoIds.length
            ? this.videoChapterModel.findOne({
                _id: { $in: videoIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,

          assessmentIds.length
            ? this.assessmentModel.findOne({
                _id: { $in: assessmentIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,

          courseAssessmentIds.length
            ? this.chapterModel.findOne({
                courseAssessmentId: { $in: courseAssessmentIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,
        ]);

      if (existingContent || existingVideo || existingAssessment || existingCourseAssessment) {
        const isCourseAssessmentDup = existingCourseAssessment || (dto.chapterType === 'COURSE_ASSESSMENT');
        return {
          data: null,
          err: {
            custom: true,
            message: isCourseAssessmentDup 
              ? 'This assessment is already linked to a chapter in this module.' 
              : 'Already exists.',
            fields: ['title'],
            code: 409,
            name: 'ValidationError',
          },
        };
      }

      if (dto.chapterType === 'CONTENT') {
        const createContent =
          await this.chapterContentService.createChapterContent({
            ...content,
            createdAt: new Date(),
            createdBy: userId,
          });

        console.log('content', createContent);

        chapter = await new this.chapterModel({
          ...dto,
          orderNumber: orderNo,
          contentId: createContent._id,
          createdAt: new Date(),
          createdBy: userId,
        }).save();
      } else if (dto.chapterType === 'ASSESSMENT') {
        const createAssessment = await this.assessmentService.createAssessment(
          assessment,
          userId,
        );

        chapter = await new this.chapterModel({
          ...dto,
          orderNumber: orderNo,
          assessmentId: createAssessment._id,
          createdAt: new Date(),
          createdBy: userId,
        }).save();
      } else if (dto.chapterType === 'COURSE_ASSESSMENT') {
        chapter = await new this.chapterModel({
          ...dto,
          orderNumber: orderNo,
          courseAssessmentId: new Types.ObjectId(dto.courseAssessmentId),
          createdAt: new Date(),
          createdBy: userId,
        }).save();
      } else if (dto.chapterType === 'VIDEO') {
        const createChapterVideo =
          await this.chapterVideoService.createChapterVideo(video);

        chapter = await new this.chapterModel({
          ...dto,
          videoId: createChapterVideo._id,
          orderNumber: orderNo,
          createdAt: new Date(),
          createdBy: userId,
        }).save();
      }

      const module = await this.moduleModel.findById(new Types.ObjectId(dto.moduleId));

      if (!module) return { data: chapter, err: null };;

      const userCourses = await this.userCourseModel.find({
        courseId: module.courseId,
      });

      if (!userCourses.length) return { data: chapter, err: null };;

      const docs = userCourses.map((uc) => ({
        userCourseId: uc._id,
        chapterId: chapter._id,
        status: UserChapterStatusType.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // console.log('docs', docs)

      await this.userCourseChapterModel.insertMany(docs);

      return { data: chapter, err: null };
    } catch (err) {
      // await session.abortTransaction();
      // console.log('err', err);
      return { data: null, err: err };
    } finally {
      // session.endSession();
    }
  }

  async updateChapter(
    updateDto: ChapterDto,
    chapterid: Types.ObjectId,
    userId?: string | 'admin',
  ) {
    const { assessment, content, video } = updateDto;

    console.log('chapid---', chapterid);

    try {
      const chapter = await this.chapterModel.findById(new Types.ObjectId(chapterid))

      if(chapter && updateDto?.durationInSec) {
        chapter.durationInSec = updateDto.durationInSec
        await chapter.save()
      }
      
      const chaptersInModule = await this.chapterModel.find({
        _id: { $ne: chapterid },
        moduleId: updateDto.moduleId,
      });

      const contentIds = chaptersInModule
        .filter((c) => c.contentId)
        .map((c) => c.contentId);

      const videoIds = chaptersInModule
        .filter((c) => c.videoId)
        .map((c) => c.videoId);

      const assessmentIds = chaptersInModule
        .filter((c) => c.assessmentId)
        .map((c) => c.assessmentId);

      const courseAssessmentIds = chaptersInModule
        .filter((c) => c.courseAssessmentId)
        .map((c) => c.courseAssessmentId);

      let title: string;

      if (updateDto.chapterType === 'CONTENT') title = updateDto.content.title;
      if (updateDto.chapterType === 'VIDEO') title = updateDto.video.title;
      if (updateDto.chapterType === 'ASSESSMENT')
        title = updateDto.assessment.title;
      if (updateDto.chapterType === 'COURSE_ASSESSMENT') {
        const courseAss = await this.courseAssessmentModel.findById(new Types.ObjectId(updateDto.courseAssessmentId));
        title = courseAss?.title || 'Course Assessment';
      }

      // const titleRegex = { $regex: `^${title}$`, $options: 'i' };
      const escapedTitle = (title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const titleRegex = {
        $regex: `^${escapedTitle}$`,
        $options: 'i',
      };

      const [existingContent, existingVideo, existingAssessment, existingCourseAssessment] =
        await Promise.all([
          contentIds.length
            ? this.chapterContentModel.findOne({
                _id: { $in: contentIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,

          videoIds.length
            ? this.videoChapterModel.findOne({
                _id: { $in: videoIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,

          assessmentIds.length
            ? this.assessmentModel.findOne({
                _id: { $in: assessmentIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,

          courseAssessmentIds.length
            ? this.courseAssessmentModel.findOne({
                _id: { $in: courseAssessmentIds },
                title: titleRegex,
                status:{$ne: StatusType.DELETED}
              })
            : null,
        ]);

      if (existingContent || existingVideo || existingAssessment || existingCourseAssessment) {
        const isCourseAssessmentDup = existingCourseAssessment || (updateDto.chapterType === 'COURSE_ASSESSMENT');
        return {
          data: null,
          err: {
            custom: true,
            message: isCourseAssessmentDup 
              ? 'This assessment is already linked to a chapter in this module.' 
              : 'Already exists.',
            fields: ['title'],
            code: 409,
            name: 'ValidationError',
          },
        };
      }

      if (updateDto.chapterType === 'CONTENT') {
        const findChapter = await this.chapterModel.findById(chapterid);

        const contentid = new mongoose.Types.ObjectId(findChapter?.contentId);

        const updateContent =
          await this.chapterContentService.updateChapterContent(contentid, {
            ...content,
            updatedAt: new Date(),
            updatedBy: userId,
          });

        // console.log('content', updateContent);
      } else if (updateDto.chapterType === 'ASSESSMENT') {
        const chapter = await this.chapterModel.findById(chapterid);

        const assessmentId = new mongoose.Types.ObjectId(chapter?.assessmentId);

        await this.assessmentService.updateAssessment(
          assessmentId,
          assessment,
          userId,
        );
      } else if (updateDto.chapterType === 'COURSE_ASSESSMENT') {
        const chapter = await this.chapterModel.findById(chapterid);
        if (chapter) {
          chapter.courseAssessmentId = new Types.ObjectId(updateDto.courseAssessmentId);
          await chapter.save();
        }
      } else if (updateDto.chapterType === 'VIDEO') {
        const findChapter = await this.chapterModel.findById(chapterid);

        const videoId = new mongoose.Types.ObjectId(
          findChapter?.videoId,
        ).toString();

        const updateVideo = await this.chapterVideoService.updateChapterVideo(
          videoId,
          {
            ...video,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        );

        console.log('Updated video', updateVideo);
      }

      return { data: { message: 'Successfully updated' }, err: null };
    } catch (err) {
      console.log('err', err);
      return { data: null, err: err };
    }
  }

  async changeChapterStatus(id: string) {
    try {
      const chapter = await this.chapterModel.findById(id);
      if (!chapter) {
        return { data: null, err: `Chapter with ID ${id} not found.` };
      }

      // Toggle status
      const newStatus =
        chapter.status === StatusType.ACTIVE
          ? StatusType.INACTIVE
          : StatusType.ACTIVE;

      // Update the chapter status
      const updatedChapter = await this.chapterModel.findByIdAndUpdate(
        id,
        { $set: { status: newStatus } },
        { new: true },
      );

      return { data: updatedChapter, err: null };
    } catch (error) {
      console.error('Error changing chapter status:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async changeChapterDelete(id: string) {
    try {
      const deletedChapter = await this.chapterModel.findByIdAndUpdate(
        id,
        { $set: { status: StatusType.DELETED } },
        { new: true },
      );

      if (!deletedChapter) {
        return { data: null, err: `Chapter with ID ${id} not found.` };
      }

      const chapterType = deletedChapter.chapterType 

      if(chapterType === 'ASSESSMENT' && deletedChapter.assessmentId) {
        await this.assessmentModel.findByIdAndUpdate(
          { _id: deletedChapter.assessmentId },
          { $set: { status: StatusType.DELETED } },
          { new: true },
        );
      }else if(chapterType === 'CONTENT') {
        await this.chapterContentModel.findByIdAndUpdate(
          { _id: deletedChapter.contentId },
          { $set: { status: StatusType.DELETED } },
          { new: true },
        );
      }else if(chapterType === 'VIDEO') {
        await this.videoChapterModel.findByIdAndUpdate(
          { _id: deletedChapter.videoId },
          { $set: { status: StatusType.DELETED } },
          { new: true },
        );
      }

      return { data: deletedChapter, err: null };
    } catch (error) {
      console.error('Error deleting chapter:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async UpdateChapterOrder(
    updatedChaptersOrders: { _id: string; orderNumber: number }[],
  ) {
    try {
      const updatePromises = updatedChaptersOrders.map(({ _id, orderNumber }) =>
        this.chapterModel
          .findByIdAndUpdate(
            _id,
            { $set: { orderNumber } },
            { new: true, runValidators: true },
          )
          .exec(),
      );

      // Execute all update operations in parallel
      const results = await Promise.all(updatePromises);

      console.log('Updated chapters Order::::::::::::::::::::::::', results);
      return { data: results, err: null };
    } catch (error) {
      console.error('Error updating chapter order:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async getChapter(id: string) {
    try {
      const objectId = new Types.ObjectId(id);
      const data = await this.chapterModel
        .aggregate()
        .lookup({
          from: 'chaptercontents',
          foreignField: '_id',
          localField: 'contentId',
          as: 'chaptercontentdetails',
        })
        .lookup({
          from: 'assessments',
          foreignField: '_id',
          localField: 'assessmentId',
          as: 'assessmentdetails',
        })
        .lookup({
          from: 'courseassessments',
          foreignField: '_id',
          localField: 'courseAssessmentId',
          as: 'courseassessmentdetails',
        })
        .lookup({
          from: 'videochapters',
          foreignField: '_id',
          localField: 'videoId',
          as: 'chapterVidoeDetails',
        })
        .match({ _id: objectId });
      return { data: data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err: err };
    }
  }

  async getAllChapters() {
    try {
      const data = await this.chapterModel
        .aggregate()
        .lookup({
          from: 'chaptercontents',
          foreignField: '_id',
          localField: 'contentId',
          as: 'chaptercontentdetails',
        })
        .lookup({
          from: 'assessments',
          foreignField: '_id',
          localField: 'assessmentId',
          as: 'assessmentdetails',
        })
        .lookup({
          from: 'courseassessments',
          foreignField: '_id',
          localField: 'courseAssessmentId',
          as: 'courseassessmentdetails',
        });
      return { data: data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err: err };
    }
  }

  async getChaptersByModule(moduleid: string,userId :string) {
    try {
      const objectId = new Types.ObjectId(moduleid);
      const userObjectId = new Types.ObjectId(userId);

      const moduledata = await this.moduleModel
        .findOne({ _id: objectId })
        .select('courseId');

      // console.log('moduledta', moduledata);

      const userCourseDetails = await this.userCourseModel.findOne({
        userId: userObjectId,
        courseId: moduledata?.courseId,
      });

      // console.log('usercourseid', userCourseDetails?._id);
      const userCourseObjectId = userCourseDetails?._id;

      const data = await this.chapterModel
        .aggregate()
        .match({ moduleId: objectId ,status:"ACTIVE"} )
        .lookup({
          from: 'chaptercontents',
          foreignField: '_id',
          localField: 'contentId',
          as: 'chaptercontentdetails',
        })
        .lookup({
          from: 'assessments',
          foreignField: '_id',
          localField: 'assessmentId',
          as: 'assessmentdetails',
        })
        .lookup({
          from: 'courseassessments',
          foreignField: '_id',
          localField: 'courseAssessmentId',
          as: 'courseassessmentdetails',
        })
        .lookup({
          from: 'videochapters',
          foreignField: '_id',
          localField: 'videoId',
          as: 'chapterVidoeDetails',
        })
        .lookup({
          from: 'usercoursechapters',
          let: { chapterId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$chapterId', '$$chapterId'] } } },
            { $match: { userCourseId: userCourseObjectId } },
          ],
          as: 'userChapterDetails',
        })
        .sort({ orderNumber: 1 });

      return { data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err };
    }
  }

  // for admin
  async getChaptersByModuleAdmin(moduleid: string) {
    try {
      const objectId = new Types.ObjectId(moduleid);

      const data = await this.chapterModel
        .aggregate()
        .match({ moduleId: objectId } )
        .lookup({
          from: 'chaptercontents',
          foreignField: '_id',
          localField: 'contentId',
          as: 'chaptercontentdetails',
        })
        .lookup({
          from: 'assessments',
          foreignField: '_id',
          localField: 'assessmentId',
          as: 'assessmentdetails',
        })
        .lookup({
          from: 'courseassessments',
          foreignField: '_id',
          localField: 'courseAssessmentId',
          as: 'courseassessmentdetails',
        })
        .lookup({
          from: 'videochapters',
          foreignField: '_id',
          localField: 'videoId',
          as: 'chapterVidoeDetails',
        })
        .sort({ orderNumber: 1 });

      return { data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err };
    }
  }

  // async getChapterNamesByModule(moduleid: string) {
  //   try {
  //     const objectId = new Types.ObjectId(moduleid);

  //     const data = await this.chapterModel
  //       .aggregate()
  //       .match({ moduleId: objectId })
  //       .lookup({
  //         from: 'chaptercontents',
  //         foreignField: '_id',
  //         localField: 'contentId',
  //         as: 'chaptercontentdetails',
  //       })
  //       .lookup({
  //         from: 'assessments',
  //         foreignField: '_id',
  //         localField: 'assessmentId',
  //         as: 'assessmentdetails',
  //       })
  //       .project({
  //         chapterId: '$_id',
  //         chapterType: 1,
  //         orderNumber: 1,
  //         moduleId: moduleid,
  //         chapterdetails: {
  //           $cond: [
  //             { $gt: [{ $size: '$chaptercontentdetails' }, 0] },
  //             {
  //               contentId: { $arrayElemAt: ['$chaptercontentdetails._id', 0] },
  //               chaptername: {
  //                 $arrayElemAt: ['$chaptercontentdetails.title', 0],
  //               },
  //             },
  //             {
  //               assessmentId: { $arrayElemAt: ['$assessmentdetails._id', 0] },
  //               chaptername: { $arrayElemAt: ['$assessmentdetails.title', 0] },
  //             },
  //           ],
  //         },
  //       });

  //     return { data, err: null };
  //   } catch (err) {
  //     console.log(err);
  //     return { data: null, err: err };
  //   }
  // }
  async getChapterNamesByModule(moduleid: string, userId: string) {
    try {
      const objectId = new Types.ObjectId(moduleid);
      const userObjectId = new Types.ObjectId(userId);

      const moduledata = await this.moduleModel
        .findOne({ _id: objectId })
        .select('courseId');

      // console.log('moduledta', moduledata);

      const userCourseDetails = await this.userCourseModel.findOne({
        userId: userObjectId,
        courseId: moduledata?.courseId,
      });

      // console.log('usercourseid', userCourseDetails?._id);
      const userCourseObjectId = userCourseDetails?._id;

      const data = await this.chapterModel
        .aggregate()
        .match({ moduleId: objectId,status:"ACTIVE" })
        .sort({ orderNumber: 1 })
        .lookup({
          from: 'chaptercontents',
          foreignField: '_id',
          localField: 'contentId',
          as: 'chaptercontentdetails',
        })
        .lookup({
          from: 'assessments',
          foreignField: '_id',
          localField: 'assessmentId',
          as: 'assessmentdetails',
        })
        .lookup({
          from: 'courseassessments',
          foreignField: '_id',
          localField: 'courseAssessmentId',
          as: 'courseassessmentdetails',
        })
        .lookup({
          from: 'videochapters',
          foreignField: '_id',
          localField: 'videoId',
          as: 'chaptervidoedetails',
        })
        .lookup({
          from: 'usercoursechapters',
          let: { chapterId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$chapterId', '$$chapterId'] } } },
            { $match: { userCourseId: userCourseObjectId } },
          ],
          as: 'userChapterDetails',
        })
        .project({
          chapterId: '$_id',
          chapterType: 1,
          orderNumber: 1,
          moduleId: objectId,
          userStatus: {
            $cond: [
              { $gt: [{ $size: '$userChapterDetails' }, 0] },
              { $arrayElemAt: ['$userChapterDetails.status', 0] },
              null,
            ],
          },
          chapterdetails: {
            $cond: [
              { $gt: [{ $size: '$chaptercontentdetails' }, 0] },
              {
                contentId: { $arrayElemAt: ['$chaptercontentdetails._id', 0] },
                chaptername: {
                  $arrayElemAt: ['$chaptercontentdetails.title', 0],
                },
              },
              {
                $cond: [
                  { $gt: [{ $size: '$assessmentdetails' }, 0] },
                  {
                    assessmentId: {
                      $arrayElemAt: ['$assessmentdetails._id', 0],
                    },
                    chaptername: {
                      $arrayElemAt: ['$assessmentdetails.title', 0],
                    },
                  },
                  {
                    $cond: [
                      { $gt: [{ $size: '$courseassessmentdetails' }, 0] },
                      {
                        courseAssessmentId: {
                          $arrayElemAt: ['$courseassessmentdetails._id', 0],
                        },
                        chaptername: {
                          $arrayElemAt: ['$courseassessmentdetails.title', 0],
                        },
                      },
                      {
                        videoId: { $arrayElemAt: ['$chaptervidoedetails._id', 0] },
                        chaptername: {
                          $arrayElemAt: ['$chaptervidoedetails.title', 0],
                        },
                      },
                    ]
                  },
                ],
              },
            ],
          },
        });

      return { data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err };
    }
  }

  async getAssessmentQuestions(chapterid: string) {
    try {
      const chapterId = new Types.ObjectId(chapterid);
      const findChapter = await this.chapterModel.findById(chapterId);
      const assessmentId = new Types.ObjectId(findChapter.assessmentId);
      const data = await this.assessmentService.getAssessment(assessmentId);
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getTotalChaptersByCourse(courseid: string) {
    try {
      const data = await this.chapterModel.aggregate([
        {
          $lookup: {
            from: 'coursemodules',
            localField: 'moduleId',
            foreignField: '_id',
            as: 'module',
          },
        },
        {
          $unwind: '$module',
        },
        {
          $match: {
            'module.courseId': new Types.ObjectId(courseid),
            status:"ACTIVE",
            'module.status':{$ne:StatusType.DELETED},
            isDeleted: { $ne: true },
          },
        },
        {
          $facet: {
            totalChapters: [{ $count: 'count' }],
            videoChapters: [
              { $match: { chapterType: 'VIDEO' } },
              {
                $project: {
                  _id: 0,
                  chapterId: '$_id',
                  chapterType: 1,
                  videoId: 1,
                },
              },
            ],
          },
        },
      ]);
      // console.log("total",totalChapters);

      return {
        data: {
          totalChapters: data[0]?.totalChapters[0]?.count || 0,
          videoChapters: data[0]?.videoChapters || [],
        },
        err: null,
      };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getAllChapterIdByCourse(courseid: Types.ObjectId) {
    try {
      const chapters = await this.chapterModel.aggregate([
        {
          $lookup: {
            from: 'coursemodules',
            localField: 'moduleId',
            foreignField: '_id',
            as: 'module',
          },
        },
        {
          $match: {
            'module.courseId': new Types.ObjectId(courseid),
          },
        },
        {
          $project: {
            _id: 1,
          },
        },
      ]);
      console.log('total', chapters);

      const data = chapters;
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getChapterListByModule(moduleid: string) {
    try {
      const objectId = new Types.ObjectId(moduleid);

      const data = await this.chapterModel
        .aggregate()
        .match({ moduleId: objectId })
        .sort({ orderNumber: -1 })
        .limit(1);

      return { data, err: null };

    } catch (err) {
      console.log(err);
      return { data: null, err };
    }
  }
}

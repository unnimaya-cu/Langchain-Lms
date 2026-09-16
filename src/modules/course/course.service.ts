import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Course } from './schema/course.schema';
import mongoose, { Model, Types } from 'mongoose';
import { CourseDto } from './dto/course.dto';
import { MiscService } from '../misc/misc.service';
import { ModelNames } from 'src/common/enum/model-names.enum';
import { RatingreviewService } from '../user/userRatingReview/ratingreview.service';
import { CoursemoduleService } from '../coursemodule/coursemodule.service';
import { StatusType } from 'src/common/enum/status-type.enum';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/common/enum/notification-type.enum';
import { NotificationGateway } from '../notification/notification.gateway';
import { StudentSubmissionStatus } from 'src/common/enum/student-submission.enum';
import { GetCoursesDto } from './dto/get-courses.dto';
import { StudentAssessmentStatus } from 'src/common/enum/student-assessment-status';
import { UserCourses } from '../user/userCourses/schema/usercourses.schema';
import { CourseModule } from '../coursemodule/schema/coursemodule.schema';

@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name)
    private readonly courseModel: Model<Course>,
    private readonly miscService: MiscService,
    private readonly ratingReviewService: RatingreviewService,
    private readonly coursemoduleService: CoursemoduleService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    @InjectModel(UserCourses.name)
    private readonly userCourseModel: Model<UserCourses>,
    @InjectModel(CourseModule.name)
    private readonly courseModuleModel: Model<CourseModule>,
  ) { }

  async topCourse() {
    try {
      const data = await this.courseModel
        .aggregate([
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
              averageRating: {
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
            $sort: {
              averageRating: -1,
            },
          },
        ])
        .limit(5);

      return { data: data, err: null };
    } catch (error) {
      console.log('Error while getting top course', error);
      return { data: null, err: error };
    }
  }

  async createCourse(dto: CourseDto) {
    try {
      const existingCourseTitle = await this.courseModel.findOne({
        title: { $regex: `^${dto.title}$`, $options: 'i' },
      });

      if (existingCourseTitle) {
        return {
          data: null,
          err: {
            custom: true,
            message: 'Already exists',
            fields: ['title'],
            code: 409,
            name: 'ValidationError',
          },
        };
      }

      const courseCode = await this.miscService.getNextSequence(
        ModelNames.COURSE,
      );
      console.log('courseCode', courseCode);

      const courseData = await new this.courseModel({
        ...dto,
        courseCode,
      }).save();

      const notification = await this.notificationService.CreateNewNotification(
        NotificationType.NEW_COURSE,
        courseData._id.toString(),
      );

      // Send notification
      await this.notificationGateway.sendNotification(
        notification.data._id.toString(),
      );

      console.log('courseData', courseData);

      return { data: courseData, err: null };
    } catch (error) {
      console.log('Error while creating course: ', error);
      return { data: null, err: error };
    }
  }

  async updateCourse(id: string, updateCourseDto: CourseDto) {
    console.log('updateCourseDto', updateCourseDto);

    const updatedModulesOrders = [
      ...(updateCourseDto.updatedModulesOrders || []),
    ];
    console.log('Cloned updatedModulesOrders:', updatedModulesOrders);

    try {
      const existingCourseTitle = await this.courseModel.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        title: { $regex: `^${updateCourseDto.title}$`, $options: 'i' },
      });

      if (existingCourseTitle) {
        return {
          data: null,
          err: {
            custom: true,
            message: 'Already exists',
            fields: ['title'],
            code: 409,
            name: 'ValidationError',
          },
        };
      }
      const updateCourse = await this.courseModel
        .findByIdAndUpdate(
          id,
          { $set: updateCourseDto },
          { new: true, runValidators: true },
        )
        .exec();
      console.log('updatee', updateCourse);
      if (updatedModulesOrders.length > 0) {
        console.log('Before UpdateChapterOrder:', updatedModulesOrders);
        await this.coursemoduleService.UpdateModulesOrder(updatedModulesOrders);
      }

      return { data: updateCourse, err: null };
    } catch (error) {
      console.error(error);
      return { data: null, err: error };
    }
  }

  // get by id
  async getOneCourseById(id: string) {
    try {
      console.log('id', id);

      const course = await this.courseModel.findById(id).exec();

      const summaryResult = await this.userCourseModel.aggregate([
        {
          $match: {
            courseId: new Types.ObjectId(id)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $lookup: {
            from: 'coursemodules',
            localField: 'courseId',
            foreignField: 'courseId',
            as: 'courseModules'
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
          $addFields: {
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
            }
          }
        },
        {
          $group: {
            _id: null,

            totalLearners: {
              $sum: 1
            },
            activeLearners: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$userDetails.lastLogin',
                      {
                        $dateSubtract: {
                          startDate: '$$NOW',
                          unit: 'day',
                          amount: 2
                        }
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            inactiveLearners: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      {
                        $eq: ['$userDetails.lastLogin', null]
                      },
                      {
                        $lt: [
                          '$userDetails.lastLogin',
                          {
                            $dateSubtract: {
                              startDate: '$$NOW',
                              unit: 'day',
                              amount: 7
                            }
                          }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            completedCourseCount: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$progressPercentage', 100]
                  },
                  1,
                  0
                ]
              }
            },
            totalProgress: {
              $sum: {
                $ifNull: ['$progressPercentage', 0]
              }
            },
            courseDurationInSec: {
              $first: '$totalDurationInSec'
            },
          }
        },
        {
          $project: {
            _id: 0,
            totalLearners: 1,
            activeLearners: 1,
            inactiveLearners: 1,
            completedCourseCount: 1,
            averageProgress: {
              $cond: [
                {
                  $eq: ['$totalLearners', 0]
                },
                0,
                {
                  $round: [
                    {
                      $divide: [
                        '$totalProgress',
                        '$totalLearners'
                      ]
                    },
                    2
                  ]
                }
              ]
            },
            courseDurationInSec: 1,
            courseDuration: {
              $cond: [
                { $eq: ['$courseDurationInSec', 0] },
                '0h',
                {
                  $cond: [
                    { $gte: ['$courseDurationInSec', 3600] },
                    {
                      $concat: [
                        {
                          $toString: {
                            $round: [
                              { $divide: ['$courseDurationInSec', 3600] },
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
                              { $divide: ['$courseDurationInSec', 60] },
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
      ])

      const modules = await this.courseModuleModel.aggregate([
        {
          $match: {
            courseId: new Types.ObjectId(id),
            // status: { $ne: StatusType.DELETED }
          }
        },
        // {
        //   $lookup: {
        //     from: 'chapters',
        //     localField: '_id',
        //     foreignField: 'moduleId',
        //     as: 'chapters'
        //   }
        // },
        {
          $lookup: {
            from: 'chapters',
            let: {
              moduleId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$moduleId', '$$moduleId']
                  },
                  status: { $ne: StatusType.DELETED }
                }
              }
            ],
            as: 'chapters'
          }
        },
        {
          $lookup: {
            from: 'chaptercontents',
            localField: 'chapters.contentId',
            foreignField: '_id',
            as: 'contentDocs'
          }
        },
        {
          $lookup: {
            from: 'videochapters',
            localField: 'chapters.videoId',
            foreignField: '_id',
            as: 'videoDocs'
          }
        },
        {
          $lookup: {
            from: 'assessments',
            localField: 'chapters.assessmentId',
            foreignField: '_id',
            as: 'assessmentDocs'
          }
        },
        {
          $lookup: {
            from: 'courseassessments',
            localField: 'chapters.courseAssessmentId',
            foreignField: '_id',
            as: 'courseAssessments'
          }
        },
        {
          $addFields: {
            totalDurationInSec: {
              $sum: {
                $map: {
                  input: '$chapters',
                  as: 'chapter',
                  in: {
                    $ifNull: ['$$chapter.durationInSec', 0]
                  }
                }
              }
            }
          }
        },
        {
          $sort: { moduleOrder: 1 }
        },
        {
          $project: {
            _id: 0,
            moduleId: '$_id',
            title: 1,
            status: 1,
            duration: {
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
                              {
                                $divide: ['$totalDurationInSec', 3600]
                              },
                              1
                            ]
                          }
                        },
                        ' hrs'
                      ]
                    },
                    {
                      $concat: [
                        {
                          $toString: {
                            $round: [
                              {
                                $divide: ['$totalDurationInSec', 60]
                              },
                              0
                            ]
                          }
                        },
                        ' mins'
                      ]
                    }
                  ]
                }
              ]
            },
            contentCount: {
              $size: {
                $filter: {
                  input: '$chapters',
                  as: 'chapter',
                  cond: {
                    $eq: ['$$chapter.chapterType', 'CONTENT']
                  }
                }
              }
            },
            videoDuration: {
              $let: {
                vars: {
                  totalVideoSec: {
                    $sum: {
                      $map: {
                        input: {
                          $filter: {
                            input: '$chapters',
                            as: 'chapter',
                            cond: {
                              $eq: ['$$chapter.chapterType', 'VIDEO']
                            }
                          }
                        },
                        as: 'video',
                        in: {
                          $ifNull: ['$$video.durationInSec', 0]
                        }
                      }
                    }
                  }
                },
                in: {
                  $cond: [
                    { $eq: ['$$totalVideoSec', 0] },
                    '0h',
                    {
                      $cond: [
                        { $gte: ['$$totalVideoSec', 3600] },
                        {
                          $concat: [
                            {
                              $toString: {
                                $round: [
                                  { $divide: ['$$totalVideoSec', 3600] },
                                  1
                                ]
                              }
                            },
                            ' hrs'
                          ]
                        },
                        {
                          $concat: [
                            {
                              $toString: {
                                $max: [
                                  1,
                                  {
                                    $round: [
                                      { $divide: ['$$totalVideoSec', 60] },
                                      0
                                    ]
                                  }
                                ]
                              }
                            },
                            ' mins'
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            },
            assessmentCount: {
              $size: {
                $filter: {
                  input: '$chapters',
                  as: 'chapter',
                  cond: {
                    // $eq: ['$$chapter.chapterType', 'ASSESSMENT']   
                    $in: [
                      "$$chapter.chapterType",
                      ["ASSESSMENT", "COURSE_ASSESSMENT"]
                    ]
                  }
                }
              }
            },
            chapters: {
              $map: {
                input: '$chapters',
                as: 'chapter',
                in: {
                  type: '$$chapter.chapterType',
                  duration: {
                    $let: {
                      vars: {
                        sec: {
                          $ifNull: ['$$chapter.durationInSec', 0]
                        }
                      },
                      in: {
                        $cond: [
                          { $eq: ['$$sec', 0] },
                          '0h',
                          {
                            $cond: [
                              { $gte: ['$$sec', 3600] },
                              {
                                $concat: [
                                  {
                                    $toString: {
                                      $round: [
                                        {
                                          $divide: ['$$sec', 3600]
                                        },
                                        1
                                      ]
                                    }
                                  },
                                  ' hrs'
                                ]
                              },
                              {
                                $concat: [
                                  {
                                    $toString: {
                                      $round: [
                                        {
                                          $divide: ['$$sec', 60]
                                        },
                                        0
                                      ]
                                    }
                                  },
                                  ' mins'
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    }
                  },

                  title: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $eq: ['$$chapter.chapterType', 'CONTENT']
                          },
                          then: {
                            $let: {
                              vars: {
                                content: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: '$contentDocs',
                                        as: 'c',
                                        cond: {
                                          $eq: [
                                            '$$c._id',
                                            '$$chapter.contentId'
                                          ]
                                        }
                                      }
                                    },
                                    0
                                  ]
                                }
                              },
                              in: '$$content.title'
                            }
                          }
                        },
                        {
                          case: {
                            $eq: ['$$chapter.chapterType', 'VIDEO']
                          },
                          then: {
                            $let: {
                              vars: {
                                video: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: '$videoDocs',
                                        as: 'v',
                                        cond: {
                                          $eq: [
                                            '$$v._id',
                                            '$$chapter.videoId'
                                          ]
                                        }
                                      }
                                    },
                                    0
                                  ]
                                }
                              },
                              in: '$$video.title'
                            }
                          }
                        },
                        {
                          case: {
                            // $eq: ['$$chapter.chapterType', 'ASSESSMENT']
                            $in: [
                              '$$chapter.chapterType',
                              ['ASSESSMENT', 'COURSE_ASSESSMENT']
                            ]
                          },
                          then: {
                            $let: {
                              vars: {
                                assessment: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: '$assessmentDocs',
                                        as: 'a',
                                        cond: {
                                          $eq: [
                                            '$$a._id',
                                            '$$chapter.assessmentId'
                                          ]
                                        }
                                      }
                                    },
                                    0
                                  ]
                                }
                              },
                              in: {
                                $ifNull: [
                                  '$$assessment.title',
                                  {
                                    $let: {
                                      vars: {
                                        courseAssessment: {
                                          $arrayElemAt: [
                                            {
                                              $filter: {
                                                input: '$courseAssessments',
                                                as: 'ca',
                                                cond: {
                                                  $eq: [
                                                    '$$ca._id',
                                                    '$$chapter.courseAssessmentId'
                                                  ]
                                                }
                                              }
                                            },
                                            0
                                          ]
                                        }
                                      },
                                      in: '$$courseAssessment.title'
                                    }
                                  }
                                ]
                              }
                            }
                          }
                        }
                      ],
                      default: ''
                    }
                  }
                }
              }
            }
          }
        }
      ]);
      
      const summary = summaryResult[0] || {
        totalLearners: 0,
        activeLearners: 0,
        inactiveLearners: 0,
        completedCourseCount: 0,
        averageProgress: 0
      };

      console.log('dataa', course);

      let data = {
        ...course.toObject(),
        totalLearners: summary?.totalLearners || 0,
        inactiveLearners: summary?.inactiveLearners || 0,
        averageProgress: summary?.averageProgress || 0,
        completedCourseCount: summary?.completedCourseCount || 0,
        modules
      }
      return { data: data, err: null };
    } catch (error) {
      console.log('Error while getting course', error);
      return { data: null, err: error };
    }
  }

  // getallcourses-user
  async getAllCourses(
    type?: string,
    startIndex?: number,
    noOfItems?: number,
    search?: string,
    userId?: string,
    rating?: number,
    categoryId?: string,
    courseLevel?: string,
  ) {
    try {
      const condObj: any = { status: 'ACTIVE' };

      if (search && search !== '0') {
        condObj.$or = [
          { title: { $regex: new RegExp(search, 'i') } },
          { courseCode: { $regex: new RegExp(search, 'i') } },
        ];
      }
      if (categoryId && categoryId !== '0') {
        condObj.categoryId = new mongoose.Types.ObjectId(categoryId);
      }

      // const totalCount = await this.courseModel.countDocuments({
      //   status: 'ACTIVE',
      // });
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'wishlists',
            localField: '_id',
            foreignField: 'courseId',
            as: 'wishlistData',
          },
        },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: '_id',
            foreignField: 'courseId',
            as: 'ratings',
          },
        },
        {
          $lookup: {
            from: 'usercourses',
            localField: '_id',
            foreignField: 'courseId',
            as: 'usercourselistData',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',   // course.createdBy (ObjectId)
            foreignField: '_id',       // user._id
            as: 'Instructor',          // put joined user inside "Instructor"
          },
        },
        {
          $unwind: {
            path: '$Instructor',
            preserveNullAndEmptyArrays: true, // keep courses even if no instructor
          },
        },
        {
          $addFields: {
            Instructor: {
              _id: '$Instructor._id',
              firstName: '$Instructor.firstName',
              lastName: '$Instructor.lastName',   // optional

            },
          },
        },

        { $match: condObj },
        {
          $addFields: {
            isInWishlist: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: { $ifNull: ['$wishlistData', []] },
                          as: 'wishlist',
                          cond: {
                            $eq: [
                              '$$wishlist.userId',
                              new mongoose.Types.ObjectId(userId),
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: true,
                else: false,
              },
            },
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
            totalEnrollCount: {
              $size: '$usercourselistData',
            },
            // 🔹 Add username directly for easy access
            createdByUsername: '$creator.username',
          },
        },
      ];
      if (rating && rating !== 0) {
        pipeline.push({
          $match: {
            averageRating: { $gte: Number(rating), $lt: Number(rating + 1) },
          },
        });
      }

      if (courseLevel && courseLevel !== '0') {
        pipeline.push({
          $match: {
            courseLevel: { $eq: courseLevel },
          },
        });
      }

      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await this.courseModel
        .aggregate(countPipeline)
        .exec();
      const totalCount = countResult[0]?.total || 0;

      if (type === 'popular') {
        pipeline.push({ $sort: { totalEnrollCount: -1 } });
      } else {
        pipeline.push({ $sort: { createdAt: 1 } });
      }

      pipeline.push(
        {$sort:{createdAt:-1}},
        { $skip: startIndex || 0 },
        { $limit: noOfItems || 10 },
        {
          $project: {
            createdBy: 0,
            updatedBy: 0,
            createdAt: 0,
            updatedAt: 0,
            wishlistData: 0,
            ratings: 0,
            coverImg: 0,
            rating: 0,
            courseTags: 0,
            modules: 0,
            usercourselistData: 0,
          },
        },
      );

      const data = await this.courseModel.aggregate(pipeline).exec();

      return { data: { data, totalCount }, err: null };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return { data: null, err: error };
    }
  }
  // async getAllCourses(
  //   startIndex?: number,
  //   noOfItems?: number,
  //   search?: string,
  //   userId?: string,
  // ) {
  //   try {
  //     const condObj: object =
  //       search && search !== '0'
  //         ? {
  //             $or: [
  //               { title: { $regex: new RegExp(search, 'i') } },
  //               { courseCode: { $regex: new RegExp(search, 'i') } },
  //             ],
  //           }
  //         : {};
  //     console.log('Search conditions:', condObj);

  //     const coursemodules = await this.courseModel
  //       .aggregate([
  //         {
  //           $lookup: {
  //             from: 'coursemodules',
  //             foreignField: 'courseId',
  //             localField: '_id',
  //             as: 'moduledetails',
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: 'wishlists',
  //             localField: '_id',
  //             foreignField: 'courseId',
  //             as: 'wishlistData',
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: 'ratingreviews',
  //             localField: '_id',
  //             foreignField: 'courseId',
  //             as: 'ratings',
  //           },
  //         },
  //         { $match: condObj },
  //         { $sort: { createdAt: 1 } },
  //         { $skip: startIndex || 0 },
  //         { $limit: noOfItems || 10 },
  //         {
  //           $addFields: {
  //             isInWishlist: {
  //               $cond: {
  //                 if: {
  //                   $gt: [
  //                     {
  //                       $size: {
  //                         $filter: {
  //                           input: { $ifNull: ['$wishlistData', []] },
  //                           as: 'wishlist',
  //                           cond: {
  //                             $eq: [
  //                               '$$wishlist.userId',
  //                               new mongoose.Types.ObjectId(userId),
  //                             ],
  //                           },
  //                         },
  //                       },
  //                     },
  //                     0,
  //                   ],
  //                 },
  //                 then: true,
  //                 else: false,
  //               },
  //             },
  //             averageRating: {
  //               $cond: {
  //                 if: { $gt: [{ $size: '$ratings' }, 0] },
  //                 then: { $avg: '$ratings.rating' },
  //                 else: 0,
  //               },
  //             },
  //             ratingCount: {
  //               $size: '$ratings',
  //             },
  //           },
  //         },
  //         {
  //           $project: {
  //             createdBy: 0,
  //             updatedBy: 0,
  //             createdAt: 0,
  //             updatedAt: 0,
  //             wishlistData: 0,
  //             ratings: 0,
  //           },
  //         },
  //       ])
  //       .exec();

  //     console.log('Course modules with wishlist status:', coursemodules);

  //     return { data: coursemodules, err: null };
  //   } catch (error) {
  //     console.error('Error fetching courses:', error);
  //     return { data: null, err: error };
  //   }
  // }

  // get course with wishlist,mylearning,totalrating by user
  async getCourse(userId: string, courseId: string) {
    // const courseObjectId = new Types.ObjectId(courseId)
    try {
      const getCourse = await this.courseModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
        // {
        //   $lookup: {
        //     from: 'coursemodules',
        //     foreignField: 'courseId',
        //     localField: '_id',
        //     as: 'moduledetails',
        //   },
        // },
        {
          $lookup: {
            from: 'coursemodules',
            let: { courseId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$courseId', '$$courseId']
                  }
                }
              },
              {
                $sort: {
                  moduleOrder: 1
                }
              }
            ],
            as: 'moduledetails',
          },
        },
        {
          $lookup: {
            from: 'chapters',
            let: {
              moduleIds: '$moduledetails._id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$moduleId', '$$moduleIds'],
                  },
                  status: { $ne: StatusType.DELETED },
                },
              },
            ],
            as: 'chapters',
          },
        },
        {
          $addFields: {
            moduledetails: {
              $map: {
                input: '$moduledetails',
                as: 'module',
                in: {
                  $let: {
                    vars: {
                      totalDurationInSec: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: '$chapters',
                                as: 'chapter',
                                cond: {
                                  $eq: ['$$chapter.moduleId', '$$module._id'],
                                },
                              },
                            },
                            as: 'chapter',
                            in: {
                              $ifNull: ['$$chapter.durationInSec', 0],
                            },
                          },
                        },
                      },
                    },
                    in: {
                      $mergeObjects: [
                        '$$module',
                        {
                          durationText: {
                            $cond: [
                              { $eq: ['$$totalDurationInSec', 0] },
                              '0h',
                              {
                                $cond: [
                                  { $gte: ['$$totalDurationInSec', 3600] },
                                  {
                                    $concat: [
                                      {
                                        $toString: {
                                          $round: [
                                            {
                                              $divide: [
                                                '$$totalDurationInSec',
                                                3600,
                                              ],
                                            },
                                            1,
                                          ],
                                        },
                                      },
                                      'h',
                                    ],
                                  },
                                  {
                                    $concat: [
                                      {
                                        $toString: {
                                          $round: [
                                            {
                                              $divide: [
                                                '$$totalDurationInSec',
                                                60,
                                              ],
                                            },
                                            0,
                                          ],
                                        },
                                      },
                                      'min',
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: 'wishlists',
            localField: '_id',
            foreignField: 'courseId',
            as: 'wishlistData',
          },
        },
        {
          $lookup: {
            from: 'usercourses',
            localField: '_id',
            foreignField: 'courseId',
            as: 'usercourselistData',
          },
        },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: '_id',
            foreignField: 'courseId',
            as: 'ratings',
          },
        },
        {
          $addFields: {
            isInWishlist: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$wishlistData',
                          as: 'wishlist',
                          cond: {
                            $eq: [
                              '$$wishlist.userId',
                              new mongoose.Types.ObjectId(userId),
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $addFields: {
            isInusercourselist: {
              $cond: {
                if: {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: '$usercourselistData',
                          as: 'usercourse',
                          cond: {
                            $eq: [
                              '$$usercourse.userId',
                              new mongoose.Types.ObjectId(userId),
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                then: true,
                else: false,
              },
            },
            ratingData: {
              totalRating: {
                $sum: '$ratings.rating',
              },
              // averageRating: {
              //   $avg: '$ratings.rating',
              // },
              averageRating: {
                $round:[
                  { $avg: '$ratings.rating' },
                  1
                ]
              },
              ratingCount: {
                $size: '$ratings',
              },
            },
          },
        },
        {
          $addFields: {
            totalEnrollCount: {
              $size: '$usercourselistData',
            },
          },
        },
        {
          $project: {
            wishlistData: 0,
            usercourselistData: 0,
            ratings: 0,
            chapters:0
          },
        },
      ]);
      return { data: getCourse?.[0] || null, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  // getallcourses-admin
  // async getAllCoursesAdmin(
  //   startIndex?: string,
  //   noOfItems?: string,
  //   search?: string,
  //   filter?: {
  //     category?: string[];
  //     sortOrder?: 'HIGH_TO_LOW' | 'LOW_TO_HIGH';
  //     status?: string[];
  //     level?: string[];
  //   },
  // ) {
  //   try {
  //     const skip = startIndex ? parseInt(startIndex, 10) : 0;
  //     const limit = noOfItems ? parseInt(noOfItems, 10) : 10;

  //     //  search filter
  //     const searchFilter =
  //       search && search !== '0'
  //         ? {
  //             $or: [
  //               { title: { $regex: new RegExp(search, 'i') } },
  //               { courseCode: { $regex: new RegExp(search, 'i') } },
  //             ],
  //           }
  //         : {};

  //     // Get total course count matching the search
  //     const totalCourses = await this.courseModel.countDocuments(searchFilter);

  //     const courselist = await this.courseModel
  //       .aggregate([
  //         {
  //           $addFields: {
  //             categoryId: {
  //               $toObjectId: '$categoryId',
  //             },
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: 'categories',
  //             foreignField: '_id',
  //             localField: 'categoryId',
  //             as: 'categories',
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: 'ratingreviews',
  //             localField: '_id',
  //             foreignField: 'courseId',
  //             as: 'rating',
  //           },
  //         },
  //         {
  //           $addFields: {
  //             averageRating: {
  //               $cond: {
  //                 if: {
  //                   $gt: [
  //                     {
  //                       $size: '$rating',
  //                     },
  //                     0,
  //                   ],
  //                 },
  //                 then: {
  //                   $avg: '$rating.rating',
  //                 },
  //                 else: 0,
  //               },
  //             },
  //           },
  //         },
  //         {
  //           $unset: ['modules', 'rating'],
  //         },
  //         {
  //           $set: {
  //             categories: {
  //               $map: {
  //                 input: '$categories',
  //                 as: 'category',
  //                 in: {
  //                   _id: '$$category._id',
  //                   name: '$$category.name',
  //                 },
  //               },
  //             },
  //           },
  //         },
  //         {
  //           $unwind: {
  //             path: '$categories',
  //             preserveNullAndEmptyArrays: true,
  //           },
  //         },
  //         //
  //         {
  //           $match: searchFilter,
  //         },
  //         {
  //           $sort: { createdAt: 1 },
  //         },
  //         {
  //           $skip: skip,
  //         },
  //         {
  //           $limit: limit,
  //         },
  //       ])
  //       .exec();

  //     return { data: { courselist, totalCourses }, err: null };
  //   } catch (error) {
  //     console.error('Error fetching courses:', error);
  //     return { data: null, err: error };
  //   }
  // }

  async getAllCoursesAdmin(
    startIndex?: string,
    noOfItems?: string,
    search?: string,
    filter?: {
      category?: string[];
      sortOrder?: 'HIGH_TO_LOW' | 'LOW_TO_HIGH';
      status?: string[];
      level?: string[];
    },
    userId?: string,    // Add userId parameter
    userRole?: string,  // Add userRole parameter
  ) {
    try {
      const skip = startIndex ? parseInt(startIndex, 10) : 0;
      const limit = noOfItems ? parseInt(noOfItems, 10) : 10;

      // Search filter
      const searchFilter =
        search && search !== '0'
          ? {
              $or: [
                { title: { $regex: new RegExp(search, 'i') } },
                { courseCode: { $regex: new RegExp(search, 'i') } },
              ],
            }
          : {};

      // Role-based filter: Tutors can only see their own courses
      const roleBasedFilter: any = {};
      if (userRole && userRole.toLowerCase() !== 'admin') {
        // If user is not Admin, filter by createdBy
        if (userId) {
          roleBasedFilter.createdBy = new mongoose.Types.ObjectId(userId);
        }
      }
      // If role is Admin, no filter is applied (can see all courses)

      // Category filter
      const categoryFilter =
        filter?.category && filter.category.length > 0
          ? {
              'categories._id': {
                $in: filter.category.map(
                  (id) => new mongoose.Types.ObjectId(id),
                ),
              },
            }
          : {};

      // Status filter
      const statusFilter =
        filter?.status && filter.status.length > 0
          ? { status: { $in: filter.status } }
          : {};

      // Level filter
      const levelFilter =
        filter?.level && filter.level.length > 0
          ? { courseLevel: { $in: filter.level } }
          : {};

      // Sorting logic
      let sortOrder: Record<string, 1 | -1> = { createdAt: -1 }; // Default: newest first
      if (filter?.sortOrder === 'HIGH_TO_LOW') {
        sortOrder = { averageRating: -1 };
      } else if (filter?.sortOrder === 'LOW_TO_HIGH') {
        sortOrder = { averageRating: 1 };
      }

      // Combine all filters
      const combinedFilters = {
        ...searchFilter,
        ...roleBasedFilter, // Add role-based filter
        ...categoryFilter,
        ...statusFilter,
        ...levelFilter,
      };

      // Get total course count matching the filters
      // const totalCourses = await this.courseModel.countDocuments(combinedFilters);
      const baseMatch = {
        ...searchFilter,
        ...roleBasedFilter,
        ...statusFilter,
        ...levelFilter,
        ...(filter?.category?.length
          ? {
              categoryId: {
                $in: filter.category.map((id) => new mongoose.Types.ObjectId(id))
              }
            }
          : {})
      };

      const totalCourses = await this.courseModel.countDocuments(baseMatch);
      // Fetch filtered and sorted courses
      const courselist = await this.courseModel
        .aggregate([
          {
            $addFields: {
              categoryId: { $toObjectId: '$categoryId' },
            },
          },
          {
            $lookup: {
              from: 'categories',
              foreignField: '_id',
              localField: 'categoryId',
              as: 'categories',
            },
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
              averageRating: {
                $cond: {
                  if: { $gt: [{ $size: '$rating' }, 0] },
                  then: { $avg: '$rating.rating' },
                  else: 0,
                },
              },
              totalReviews: {
                $size: '$rating',
              },
            },
          },
          // ✅ Add the $match here with all filters including role-based filter
          {
            $match: combinedFilters, // Use combined filters
          },
          {
            $unset: ['modules', 'rating'],
          },
          {
            $set: {
              categories: {
                $map: {
                  input: '$categories',
                  as: 'category',
                  in: { _id: '$$category._id', name: '$$category.name' },
                },
              },
            },
          },
          {
            $unwind: {
              path: '$categories',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'usercourses',
              localField: '_id',
              foreignField: 'courseId',
              as: 'usercourses',
            },
          },
          {
            $addFields: {
              userCount: {
                $size: '$usercourses',
              },
            },
          },
          {
            $project: {
              usercourses: 0,
            },
          },
          { $sort: sortOrder },
          { $skip: skip },
          { $limit: limit },
        ])
        .exec();

      return { data: { courselist, totalCourses }, err: null };
    } catch (error) {
      console.error('Error fetching courses:', error);
      return { data: null, err: error };
    }
  }

  // getcoursesbycategoryId-user

  async getCoursesByCategoryId(categoryid: string) {
    try {
      const categoryObjectId = new Types.ObjectId(categoryid);
      const data = await this.courseModel
        .find({ categoryId: categoryObjectId, status: 'ACTIVE' })
        .select('-createdBy -updatedBy -createdAt -updatedAt')
        .sort({createdAt: -1})
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  // get minimaldata -public api
  async getCoursesMinimal(searchQuery: string) {
    try {
      const filter = {
        title: { $regex: searchQuery, $options: 'i' },
        status: 'ACTIVE',
      };
      const data = await this.courseModel
        .find(filter)
        .select('_id title courseImg categoryId');
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getTopRatedCourse() {
    try {
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async courseStatusChange(courseId: string) {
    try {
      const course = await this.courseModel.findById(courseId);

      if (!course) {
        return { data: null, err: `Course not found.` };
      }

      if(course.status === StatusType.DELETED) {
        return {data:null, err:'Status cannot be updated for a delete course.'}
      }

      const newStatus =
        course.status === StatusType.ACTIVE
          ? StatusType.INACTIVE
          : StatusType.ACTIVE;

      const updatedCourse = await this.courseModel
        .findByIdAndUpdate(courseId, { status: newStatus }, { new: true })
        .exec();

      return { data: updatedCourse, err: null };
    } catch (err) {
      console.error('Error changing course status:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async courseDelete(courseId: string) {
    try {
      const course = await this.courseModel.findById(courseId);
      if (!course) {
        return { data: null, err: `Course with ID ${courseId} not found.` };
      }

      course.status = StatusType.DELETED;
      const deletedCourse = await course.save();

      // Delete associated modules notification

      return { data: deletedCourse, err: null };
    } catch (err) {
      console.error('Error deleting course:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async getCourseByCourseIdForAdminCourseViewPage(courseId: string) {
    try {
      const course = await this.courseModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(courseId) } },
        // {
        //   $lookup: {
        //     from: 'coursemodules',
        //     foreignField: 'courseId',
        //     localField: '_id',
        //     as: 'moduledetails',
        //   },
        // },
        {
          $lookup: {
            from: 'coursemodules',
            let: { courseId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$courseId', '$$courseId']
                  }
                }
              },
              {
                $sort: {
                  moduleOrder: 1
                }
              }
            ],
            as: 'moduledetails',
          },
        },
        {
          $lookup: {
            from: 'ratingreviews',
            localField: '_id',
            foreignField: 'courseId',
            as: 'ratings',
          },
        },
        {
          $lookup: {
            from: 'usercourses',
            localField: '_id',
            foreignField: 'courseId',
            as: 'totalUserEnrolled',
          },
        },
        {
          $addFields: {
            totalUserEnrolled: {
              $size: '$totalUserEnrolled',
            },
            ratingData: {
              totalRating: {
                $sum: '$ratings.rating',
              },
              averageRating: {
                $round:[
                  { $avg: '$ratings.rating' },
                  1
                ]
              },
              ratingCount: {
                $size: '$ratings',
              },
            },
          },
        },
        {
          $addFields: {
            moduleIds: {
              $map: {
                input: '$moduledetails',
                as: 'mod',
                in: '$$mod._id',
              },
            },
          },
        },
        {
          $lookup: {
            from: 'chapters',
            let: {
              moduleIds: '$moduleIds',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$moduleId', '$$moduleIds'],
                  },
                  status: { $ne: StatusType.DELETED}
                },
              },
            ],
            as: 'chapters',
          },
        },
        {
          $lookup: {
            from: 'courseassessments',
            let: {
              courseId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$courseId', '$$courseId']
                  },
                  status: StatusType.ACTIVE
                }
              }
            ],
            as: 'courseAssessments'
          }
        },
        {
          $addFields: {
            totalChapters: {
              $size: '$chapters',
            },
            totalAssessments: {
              $size: '$courseAssessments'
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
          },
        },
        {
          $addFields:{
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
        },
        {
          $addFields: {
            moduledetails: {
              $map: {
                input: '$moduledetails',
                as: 'module',
                in: {
                  $mergeObjects: [
                    '$$module',
                    {
                      totalDurationInSec: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: '$chapters',
                                as: 'chapter',
                                cond: {
                                  $eq: ['$$chapter.moduleId', '$$module._id']
                                }
                              }
                            },
                            as: 'chapter',
                            in: {
                              $ifNull: ['$$chapter.durationInSec', 0]
                            }
                          }
                        }
                      },
                      durationText: {
                        $let: {
                          vars: {
                            duration: {
                              $sum: {
                                $map: {
                                  input: {
                                    $filter: {
                                      input: '$chapters',
                                      as: 'chapter',
                                      cond: {
                                        $eq: ['$$chapter.moduleId', '$$module._id']
                                      }
                                    }
                                  },
                                  as: 'chapter',
                                  in: {
                                    $ifNull: ['$$chapter.durationInSec', 0]
                                  }
                                }
                              }
                            }
                          },
                          in: {
                            $cond: [
                              { $eq: ['$$duration', 0] },
                              '0h',
                              {
                                $cond: [
                                  { $gte: ['$$duration', 3600] },
                                  {
                                    $concat: [
                                      {
                                        $toString: {
                                          $round: [
                                            { $divide: ['$$duration', 3600] },
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
                                            { $divide: ['$$duration', 60] },
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
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            ratings: 0,
            modules: 0,
            chapters: 0,
            moduleIds: 0,
            courseAssessments: 0
          },
        },
      ]);

      return { data: course, err: null };
    } catch (err) {
      console.error('Error fetching course by ID:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async getCoursesList(id: string) {
    try {
      const data = await this.courseModel
        .find({ status: 'ACTIVE', categoryId: new mongoose.Types.ObjectId(id) })
        .select('_id title');
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getCourses() {
    try {
      const data = await this.courseModel
        .find({ status: 'ACTIVE'})
        .select('_id title');
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getCoursesForAdmin(dto: GetCoursesDto, userId: string, userRole: string) {
    try{
      let isAdmin = false

      if(userRole && (userRole === 'admin' || userRole === 'super admin')) isAdmin = true
      
      const searchQuery:any = [
        ...(isAdmin ? [] 
          : [{$match:{createdBy: new Types.ObjectId(userId)}}]
        ),
        ...(dto?.tab && dto.tab !== 'all'
          ? [{
              $match: {
                $expr: {
                  $eq: [
                    { $toLower: '$status' },
                    dto.tab.toLowerCase()
                  ]
                }
              }
            }]
          : []
        ),
        {
          $lookup:{
            from:'categories',
            localField:'categoryId',
            foreignField:'_id',
            as:'categoryDetails'
          }
        },
        {
          $unwind:'$categoryDetails'
        },
        {
          $lookup:{
            from:'usercourses',
            localField:'_id',
            foreignField:'courseId',
            as:'userCourses'
          }
        }, 
        {
          $lookup:{
            from:'coursemodules',
            localField:'_id',
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
          $lookup:{
            from:'users',
            localField:'userCourses.userId',
            foreignField:'_id',
            as:'userDetails'
          }
        }, 
        {
          $lookup:{
            from:'studentassessments',
            localField:'_id',
            foreignField:'courseId',
            as:'assessments'
          }
        },
        {
          $lookup:{
            from:'studentsubmissions',
            localField:'assessments._id',
            foreignField:'studentAssessmentId',
            as:'submissions'
          }
        },
        {
          $addFields:{
            modulesCount:{
              $size:{
                $ifNull:['$courseModules', []]
              }
            },
            totalLearnersCount:{
              $size:{
                $setUnion:[
                  {
                    $map:{
                      input:{
                        $ifNull:['$userCourses', []]
                      },
                      as:'uc',
                      in:'$$uc.userId'
                    }
                  },
                  [],
                ]
              }
            },
            inactiveCount:{
              $size:{
                $filter:{
                  input:{
                    $ifNull:['$userDetails', []]
                  },
                  as:'user',
                  cond:{
                    $or:[
                      {
                        $eq:['$$user.lastLogin', null]
                      }, 
                      {
                        $lt:[
                          '$$user.lastLogin',
                          {
                            $dateSubtract:{
                              startDate:'$$NOW',
                              unit:'day',
                              amount:7
                            }
                          }
                        ]
                      }
                    ]
                  }
                },
              }
            },
            assessmentsCount:{
              $size:{
                $ifNull:['$assessments', []]
              }
            },
            submittedCount:{
              $size:{
                $filter:{
                  input:{
                    $ifNull:['$assessments', []]
                  },
                  as:'assessment',
                  cond:{
                    $eq:['$$assessment.submissionStatus', StudentSubmissionStatus.SUBMITTED]
                  }
                }
              },
            },
            overdueCount: {
              $size: {
                $filter: {
                  input: {
                    $ifNull: ['$assessments', []],
                  },
                  as: 'assessment',
                  cond: {
                    $and: [
                      {
                        $lt: ['$$assessment.dueDate', '$$NOW'],
                      },
                      {
                        $eq: ['$$assessment.submissionStatus', 'expired'],
                      },
                    ],
                  },
                },
              },
            },
            lastSubmissionDate: {
              $max: '$submissions.submittedAt',
            },
            courseTitleLower: {
              $toLower: '$title'
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
          },
        },
        {
          $addFields: {
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
            $or:[
              {
                title:{
                  $regex:dto.search,
                  $options:'i'
                }
              },
              {
                courseCode:{
                  $regex: dto.search,
                  $options: 'i'
                }
              }
            ]
          }
        })
      }

      if(dto?.categoryId && dto.categoryId !== 'all') {
        searchQuery.push({
          $match:{
            'categoryDetails._id': new Types.ObjectId(dto.categoryId)
          }
        })
      }

      if(dto?.courseId && dto.courseId !== 'all') {
        searchQuery.push({
          $match:{
            _id: new Types.ObjectId(dto.courseId)
          }
        })
      }

      if (dto?.status && dto.status !== 'all') {
        searchQuery.push({
          $match: {
            status: {
              $regex: `^${dto.status}$`,
              $options: 'i'
            }
          }
        });
      }

      let sortStage:any = {updatedAt:-1}

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'recentlyupdated':
            sortStage = {updatedAt:-1}
            break;
          case 'recentlycreated':
            sortStage = {createdAt:-1}
            break;
          case 'coursenamedesc':
            sortStage = {courseTitleLower:-1}
            break;
          case 'coursenameasc':
            sortStage = {courseTitleLower:1}
            break;
          case 'mostlearners':
            sortStage = {totalLearnersCount:-1}
            break;
          case 'leastlearners':
            sortStage = {totalLearnersCount:1}
            break;
          case 'mostassessments':
            sortStage = {assessmentsCount:-1}
            break;
          case 'leastassessments':
            sortStage = {assessmentsCount:1}
            break;
          default:
            sortStage={updatedAt:-1}
        }
      }

      const totalCoursesResult = await this.courseModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalCourses = totalCoursesResult[0]?.total || 0

      const data = await this.courseModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:(dto.page - 1) * dto.limit},
        {$limit:dto.limit},
        {
          $project:{
            title:1,
            courseImg:1,
            coverImg:1,
            categoryName:'$categoryDetails.name',
            duration: '$durationText',
            modulesCount: 1,
            courseCode:1,
            totalLearnersCount:1,
            inactiveCount:1,
            assessmentsCount: 1,
            submittedCount:1,
            overdueCount: 1,
            lastSubmissionDate:1,
            status:1
          }
        }
      ])

      const allCount = await this.courseModel.countDocuments({
         ...(isAdmin
        ? {}
        : { createdBy: new Types.ObjectId(userId) }),
      })
      const activeCount = await this.courseModel.countDocuments({
        status:StatusType.ACTIVE,
         ...(isAdmin
          ? {}
          : { createdBy: new Types.ObjectId(userId) }),
      })
      const inactiveCount = await this.courseModel.countDocuments({
        status:StatusType.INACTIVE,
         ...(isAdmin
          ? {}
          : { createdBy: new Types.ObjectId(userId) }),
      })
      const deletedCount = await this.courseModel.countDocuments({
        status:StatusType.DELETED,
         ...(isAdmin
          ? {}
          : { createdBy: new Types.ObjectId(userId) }),
      })

      return {data:{
        data,
        totalCourses,
        totalPages:Math.ceil(totalCourses/dto.limit),
        currentPage:dto.page,
        allCount,
        activeCount,
        inactiveCount,
        deletedCount
      }, err:null}
    }catch(error) {
      console.error(error)
      return {data:null, err:error}
    }
  }

  async getCourseStudents(dto:GetCoursesDto, userId:string) {
    try{
      const course = await this.courseModel.findById(new Types.ObjectId(dto.courseId))
      .select('title courseCode coverImg courseImg status')
      .populate({
        path:'categoryId',
        select:'name'
      })

      if(!course) {
        return {data:null, err: 'Course not found.'}
      }

      const modulesCount = await this.courseModuleModel.countDocuments({courseId: new Types.ObjectId(dto.courseId)})

      const searchQuery:any = [
        {
          $match:{courseId: new Types.ObjectId(dto.courseId)}
        },
        {
          $sort: {
            createdAt: -1
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              courseId: '$courseId'
            },
            doc: { $first: '$$ROOT' }
          }
        },
        {
          $replaceRoot: {
            newRoot: '$doc'
          }
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
            from:'coursemodules',
            localField:'courseDetails._id',
            foreignField:'courseId',
            as:'courseModules'
          }
        },
        {
          $lookup:{
            from:'studentassessments',
            let:{
              userId:'$userDetails._id',
              courseId:'$courseDetails._id'
            },
            pipeline:[
              {
                $match:{
                  $expr:{
                    $and:[
                      {$eq:['$studentId', '$$userId']},
                      {$eq:['$courseId', '$$courseId']}
                    ]
                  }
                }
              }
            ],
            as:'assessments'
          }
        },
        {
          $addFields:{
            modulesCount:{
              $size:{
                $ifNull:['$courseModules', []]
              }
            },
            assignedCount:{
              $size:{
                $ifNull:['$assessments', []]
              }
            },
            submittedCount:{
              $size:{
                $filter:{
                  input:{
                    $ifNull:['$assessments', []]
                  },
                  as:'assessment',
                  cond:{
                    $eq:['$$assessment.submissionStatus', StudentAssessmentStatus.SUBMITTED]
                  }
                }
              },
            },
            overdueCount: {
              $size: {
                $filter: {
                  input: {
                    $ifNull: ['$assessments', []],
                  },
                  as: 'assessment',
                  cond: {
                    $and: [
                      {
                        $lt: ['$$assessment.dueDate', '$$NOW'],
                      },
                      {
                        $eq: ['$$assessment.submissionStatus', 'expired'],
                      },
                    ],
                  },
                },
              },
            },
            nameLower: {
              $toLower: {
                $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName']
              }
            },
            status:{
              $cond:[
                {$eq:['$progressPercentage', 100]},
                'Completed',
                'Not Completed'
              ]
            }
          }
        }
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

      if(dto?.status && dto.status !== 'all') {
        searchQuery.push({
          $match:{
            'status':{
              $regex: `^${dto.status}$`,
              $options:'i'
            }
          }
        })
      }

      let sortStage:any = {'userDetails.lastLogin':-1} 

      if(dto?.sortBy) {
        switch(dto.sortBy.toLowerCase()) {
          case 'recentlyactive':
            sortStage={'userDetails.lastLogin':-1}
            break;
          case 'leastrecentlyactive':
            sortStage={'userDetails.lastLogin':1}
            break;
          case 'highestprogress':
            sortStage={progressPercentage:-1}
            break;
          case 'lowestprogress':
            sortStage={progressPercentage:1}
            break;
          case 'mostassessmentssubmitted':
            sortStage={'submittedCount':-1}
            break;
          case 'leastassessmentssubmitted':
            sortStage={'submittedCount':1}
            break;
          case 'studentnameasc':
            sortStage={nameLower:1}
            break;
          case 'studentnamedesc':
            sortStage={nameLower:-1}
            break;
        }
      }

      const totalStudentsResult = await this.userCourseModel.aggregate([
        ...searchQuery,
        {
          $count:'total'
        }
      ])

      const totalStudents = totalStudentsResult[0]?.total || 0

      const data = await this.userCourseModel.aggregate([
        ...searchQuery,
        {$sort:sortStage},
        {$skip:(dto.page - 1) * dto.limit},
        {$limit: dto.limit},
        {
          $project:{
            _id:0,
            studentId:'$userDetails._id',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            profileImg: '$userDetails.profileImg',
            email: '$userDetails.email',
            progressPercentage:1,
            assignedCount:1,
            submittedCount: 1,
            overdueCount:1,
            lastActive:'$userDetails.lastLogin',
            status: 1
          }
        }
      ])

      const summaryResult = await this.userCourseModel.aggregate([
        {
          $match: {
            courseId: new Types.ObjectId(dto.courseId)
          }
        },
        {
          $sort: {
            createdAt: -1
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              courseId: '$courseId'
            },
            doc: { $first: '$$ROOT' }
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
            as: 'userDetails'
          }
        },
        {
          $unwind: '$userDetails'
        },
        {
          $lookup: {
            from: 'coursemodules',
            localField: 'courseId',
            foreignField: 'courseId',
            as: 'courseModules'
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
          $addFields: {
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
            }
          }
        },
        {
          $group: {
            _id: null,

            totalLearners: {
              $sum: 1
            },
            activeLearners: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$userDetails.lastLogin',
                      {
                        $dateSubtract: {
                          startDate: '$$NOW',
                          unit: 'day',
                          amount: 2
                        }
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            inactiveLearners: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      {
                        $eq: ['$userDetails.lastLogin', null]
                      },
                      {
                        $lt: [
                          '$userDetails.lastLogin',
                          {
                            $dateSubtract: {
                              startDate: '$$NOW',
                              unit: 'day',
                              amount: 7
                            }
                          }
                        ]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            completedCourseCount: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$progressPercentage', 100]
                  },
                  1,
                  0
                ]
              }
            },
            totalProgress: {
              $sum: {
                $ifNull: ['$progressPercentage', 0]
              }
            },
            courseDurationInSec: {
              $first: '$totalDurationInSec'
            },
          }
        },
        {
          $project: {
            _id: 0,
            totalLearners: 1,
            activeLearners: 1,
            inactiveLearners: 1,
            completedCourseCount: 1,
            averageProgress: {
              $cond: [
                {
                  $eq: ['$totalLearners', 0]
                },
                0,
                {
                  $round: [
                    {
                      $divide: [
                        '$totalProgress',
                        '$totalLearners'
                      ]
                    },
                    2
                  ]
                }
              ]
            },
            courseDurationInSec: 1,
            courseDuration: {
              $cond: [
                { $eq: ['$courseDurationInSec', 0] },
                '0h',
                {
                  $cond: [
                    { $gte: ['$courseDurationInSec', 3600] },
                    {
                      $concat: [
                        {
                          $toString: {
                            $round: [
                              { $divide: ['$courseDurationInSec', 3600] },
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
                              { $divide: ['$courseDurationInSec', 60] },
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
      ])

      const courseDurationResult = await this.courseModel.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(dto.courseId)
          }
        },
        {
          $lookup: {
            from: 'coursemodules',
            localField: '_id',
            foreignField: 'courseId',
            as: 'modules'
          }
        },
        {
          $lookup: {
            from: 'chapters',
            let: { moduleIds: '$modules._id' },
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
          $addFields: {
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
        },
        {
          $project: {
            _id: 0,
            durationText: 1
          }
        }
      ])

      const summary = summaryResult[0] || {
        totalLearners: 0,
        activeLearners: 0,
        inactiveLearners: 0,
        completedCourseCount: 0,
        averageProgress: 0
      };

      return {data:{
        data,
        totalStudents,
        totalPges:Math.ceil(totalStudents/dto.limit),
        currentPage: dto.page,
        coverImg: course.coverImg,
        courseImg: course.courseImg,
        title: course.title,
        category: (course.categoryId as any).name,
        status: course.status,
        modulesCount,
        duration:courseDurationResult[0]?.durationText || '0h',
        totalLearners: summary?.totalLearners || 0,
        activeLearners: summary?.activeLearners || 0,
        inactiveLearners: summary?.inactiveLearners || 0,
        completedCourseCount: summary?.completedCourseCount || 0,
        averageProgress: summary?.averageProgress || 0
      }, err:null}
    }catch(error) {
      console.error(error)
      return {data:null, err:error}
    }
  }
}

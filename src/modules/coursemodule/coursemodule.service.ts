import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { CourseModule } from './schema/coursemodule.schema';
import { CourseModuleDto } from './dto/coursemodule.dto';
import { ChapterService } from '../chapter/chapter.service';
import { StatusType } from 'src/common/enum/status-type.enum';

@Injectable()
export class CoursemoduleService {
  constructor(
    @InjectModel(CourseModule.name)
    private readonly CourseModuleModel: Model<CourseModule>,
    private readonly chapterService: ChapterService,
  ) {}

  async createCourseModule(dto: CourseModuleDto) {
    try {
      const moduleCount = await this.CourseModuleModel.countDocuments({
        courseId: dto.courseId,
      });
      // console.log('modulecount', moduleCount);
      // console.log('dataa', dto);

      const existingModule = await this.CourseModuleModel.findOne({
        courseId: dto.courseId,
        title: { $regex: new RegExp(`^${dto.title}$`, 'i') },
      });

      if (existingModule !== null) {
        throw new BadRequestException('This Content Title already exists.');
      }

      const orderNumber = moduleCount + 1;
      const courseModuleData = await new this.CourseModuleModel({
        ...dto,
        moduleOrder: orderNumber,
      }).save();
      return { data: courseModuleData, err: null };
    } catch (err) {
      console.log('err', err);
      return { data: null, err: err };
    }
  }

  // async updateCourseModule(id: string, updateDto: CourseModuleDto) {
  //   console.log("666666666666",updateDto);

  //   console.log("updateDto.updatedChaptersOrders ------------",updateDto.updatedChaptersOrders);
  //   try {

  //     const updateData = await this.CourseModuleModel.findByIdAndUpdate(
  //       id,
  //       { $set: updateDto },
  //       { new: true, runValidators: true },
  //     ).exec();

  //     const updatedChaptersOrders = [...(updateDto.updatedChaptersOrders || [])];
  //     console.log("Before UpdateChapterOrder:", updatedChaptersOrders);

  //     // update chapter order
  //   if (updatedChaptersOrders.length > 0) {
  //     await this.chapterService.UpdateChapterOrder(updatedChaptersOrders);
  //   }
  //     console.log('updatee', updateData);

  //     return { data: updateData, err: null };
  //   } catch (error) {
  //     console.error(error);
  //     return { data: null, err: error };
  //   }
  // }
  async updateCourseModule(id: string, updateDto: CourseModuleDto) {
    // console.log('Initial updateDto:', updateDto);

    // Clone updatedChaptersOrders to avoid mutation
    const updatedChaptersOrders = [...(updateDto.updatedChaptersOrders || [])];
    // console.log('Cloned updatedChaptersOrders:', updatedChaptersOrders);

    try {
      // Ensure updateDto is not mutated during the database operation
      const updateDtoCopy = JSON.parse(JSON.stringify(updateDto));

      // console.log('Before findByIdAndUpdate:', updateDtoCopy);

      const existingModule = await this.CourseModuleModel.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        courseId: updateDto.courseId,
        title: { $regex: new RegExp(`^${updateDto.title}$`, 'i') },
      });

      if (existingModule !== null) {
        throw new BadRequestException('This Content Title already exists.');
      }

      const updateData = await this.CourseModuleModel.findByIdAndUpdate(
        id,
        { $set: updateDtoCopy },
        { new: true, runValidators: true },
      ).exec();

      console.log('After findByIdAndUpdate, updateDto:', updateDto);
      console.log(
        'After findByIdAndUpdate, updatedChaptersOrders:',
        updatedChaptersOrders,
      );

      // Update chapter order
      if (updatedChaptersOrders.length > 0) {
        console.log('Before UpdateChapterOrder:', updatedChaptersOrders);
        await this.chapterService.UpdateChapterOrder(updatedChaptersOrders);
      }

      console.log('Updated module data:', updateData);
      return { data: updateData, err: null };
    } catch (error) {
      console.error('Error in updateCourseModule:', error);
      return { data: null, err: error };
    }
  }

  async statusChangeCourseModule(id: string) {
    try {
      const courseModule = await this.CourseModuleModel.findById(id);
      if (!courseModule) {
        return { data: null, err: `Course module with ID ${id} not found.` };
      }

      const newStatus =
        courseModule.status === StatusType.ACTIVE
          ? StatusType.INACTIVE
          : StatusType.ACTIVE;

      // Update the status in the database
      const updatedModule = await this.CourseModuleModel.findByIdAndUpdate(
        id,
        { $set: { status: newStatus } },
        { new: true },
      );

      return { data: updatedModule, err: null };
    } catch (err) {
      console.error('Error changing course module status:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async deleteCourseModule(id: string) {
    try {
      const deleteData = await this.CourseModuleModel.findByIdAndUpdate(
        id,
        { $set: { status: StatusType.DELETED } }, // Fixed typo
        { new: true },
      );

      if (!deleteData) {
        return { data: null, err: `Course module with ID ${id} not found.` };
      }

      return { data: deleteData, err: null };
    } catch (err) {
      console.error('Error deleting course module:', err);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async getAllCourseModule() {
    try {
      const courses = await this.CourseModuleModel.aggregate([
        {
          $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'coursedetails',
          },
        },
      ]);

      // console.log('Course modules with details:', courses);
      return { data: courses, err: null };
    } catch (err) {
      console.error('Error fetching course modules:', err);
      return { data: null, err: err };
    }
  }

  async getCourseModule(id: string) {
    try {
      const objectId = new Types.ObjectId(id);

      const data = await this.CourseModuleModel.findById(objectId)
        .populate('courseId', 'title')
        .exec();

      return { data: data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err: err };
    }
  }

  async getModulesByCourseId(course_id: string) {
    try {
      const objectId = new Types.ObjectId(course_id);

      const data = await this.CourseModuleModel.find({
        courseId: objectId,
        status: 'ACTIVE',
      })
        .sort({ moduleOrder: 1 })
        .exec();

      return { data, err: null };
    } catch (err) {
      console.error('Error fetching modules:', err);
      return { data: null, err };
    }
  }

  async getModulesByCourseIdForAdmin(course_id: string) {
    try {
      const objectId = new Types.ObjectId(course_id);

      const data = await this.CourseModuleModel.find({
        courseId: objectId,
      })
        .sort({ moduleOrder: 1 })
        .exec();

      return { data, err: null };
    } catch (err) {
      console.error('Error fetching modules:', err);
      return { data: null, err };
    }
  }

  async UpdateModulesOrder(
    updatedModulesOrders: { _id: string; moduleOrder: number }[],
  ) {
    try {
      const updatePromises = updatedModulesOrders.map(({ _id, moduleOrder }) =>
        this.CourseModuleModel.findByIdAndUpdate(
          _id,
          { moduleOrder },
          { new: true },
        ),
      );

      // Execute all update operations in parallel
      await Promise.all(updatePromises);

      return { data: 'Modules order updated successfully', err: null };
    } catch (error) {
      console.error('Error updating module order:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }

  async getLastChaptersWithCourseId(course_id: string) {
    try {
      // Fetch modules for the given course ID and sort by moduleOrder (ascending)
      const modulesList = await this.CourseModuleModel.aggregate([
        { $match: { courseId: new Types.ObjectId(course_id) } },
        { $sort: { moduleOrder: 1 } }, // Sort modules in ascending order
      ]);

      // console.log('Modules list:', modulesList);

      // Fetch the last chapter from each module
      const lastChapters = await Promise.all(
        modulesList.map(async (module) => {
          const { data: chapters } =
            await this.chapterService.getChapterListByModule(module._id);

          // console.log('last chapter is ', chapters);

          if (chapters.length > 0) {
            // console.log('chapters.length > 0', chapters.length > 0);

            return {
              moduleId: module._id,
              moduleTitle: module.title,
              lastChapter: chapters[0], // Get the last chapter
            };
          }
          return null; // Skip modules without chapters
        }),
      );

      // Filter out null values (modules without chapters)
      const filteredLastChapters = lastChapters.filter(
        (chapter) => chapter !== null,
      );

      return { data: filteredLastChapters, err: null };
    } catch (error) {
      console.error('Error fetching last chapters:', error);
      return { data: null, err: 'Internal Server Error' };
    }
  }
}

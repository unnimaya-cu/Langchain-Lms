import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  ChapterContent,
  ChapterContentSchema,
} from './schema/chaptercontent.schema';
import { ChapterContentDto } from './dto/chaptercontent.dto';
import { StatusType } from 'src/common/enum/status-type.enum';

@Injectable()
export class ChaptercontentService {
  constructor(
    @InjectModel(ChapterContent.name)
    private readonly chapterContentModel: Model<ChapterContent>,
  ) {}

  async createChapterContent(dto: ChapterContentDto,
    // session?:ClientSession 
  ) {
    const { title } = dto;

    // ✅ Check if content with the same title already exists
    const existingAssessment = await this.chapterContentModel.findOne({ title, status:{$ne: StatusType.DELETED} }).exec();
    // if (existingAssessment) {
    //   throw new BadRequestException('This Content Title already exists.');
    // }

    const chapterContentData = await new this.chapterContentModel(dto).save();
    return chapterContentData;
  }

  async updateChapterContent(id: Types.ObjectId, updateDto: ChapterContentDto) {
    // console.log("mnvbxm",id);

    const updateData = await this.chapterContentModel.findByIdAndUpdate(
      id,
      { $set: updateDto },
      { new: true, runValidators: true },
    ).exec()
    // console.log("up---content",updateData);

    return updateData
  }

  // async updateChapterContent(id: string, updateDto: ChapterContentDto) {
  //   try {
  //     const updateData = await this.chapterContentModel
  //       .findByIdAndUpdate(
  //         id,
  //         { $set: updateDto },
  //         { new: true, runValidators: true },
  //       )
  //       .exec();

  //     return { data: updateData, err: null };
  //   } catch (error) {
  //     console.error(error);
  //     return { data: null, err: error };
  //   }
  // }

  async getChapterContent(id: string) {
    try {
      const data = await this.chapterContentModel.findById(id).exec();
      return { data: data, err: null };
    } catch (err) {
      console.log(err);
      return { data: null, err: err };
    }
  }
}

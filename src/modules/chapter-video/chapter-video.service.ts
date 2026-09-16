import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { VideoChapter } from './schema/chapterVidoe.schema';
import { ChapterVidoeDto } from './dto/chapterVidoe.dto';

@Injectable()
export class ChapterVideoService {
  constructor(
    @InjectModel(VideoChapter.name)
    private readonly videoChapterModel: Model<VideoChapter>,
  ) {}

  async createChapterVideo(
    createVideoChapterDto: ChapterVidoeDto,
    session?: ClientSession,
  ) {
    try {
      const newChapter = new this.videoChapterModel(createVideoChapterDto);
      return newChapter.save({ session });
    } catch(error){
      if (error.code === 11000) {
        throw new BadRequestException(`Chapter title "${createVideoChapterDto.title}" already exists.`);
      }
      throw error;
    }
  }

  async updateChapterVideo(id: string, updateVideoChapterDto: ChapterVidoeDto) {
    const updatedChapter = await this.videoChapterModel.findByIdAndUpdate(
      id,
      updateVideoChapterDto,
      { new: true, runValidators: true },
    );

    if (!updatedChapter) {
      throw new NotFoundException(`Video chapter with ID ${id} not found.`);
    }

    return updatedChapter;
  }

  async getChapterVideo(id: string) {
    const chapter = await this.videoChapterModel.findById(id).exec();

    if (!chapter) {
      throw new NotFoundException(`Video chapter with ID ${id} not found.`);
    }

    return chapter;
  }

  //   async deleteChapterVideo(id: string) {
  //     const result = await this.videoChapterModel.findByIdAndDelete(id).exec();

  //     if (!result) {
  //       throw new NotFoundException(`Video chapter with ID ${id} not found.`);
  //     }

  //     return { message: 'Video chapter deleted successfully.' };
  //   }
}

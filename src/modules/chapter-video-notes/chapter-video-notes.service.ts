import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { VideoNote } from './schema/chaptervideo-note.schema';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { VideoNoteDto } from './dto/chaptervideo-note.dto';

@Injectable()
export class ChapterVideoNotesService {
  constructor(
    @InjectModel(VideoNote.name)
    private readonly videoNoteModel: Model<VideoNote>,
  ) {}

  async createNote(dto: VideoNoteDto, userid: string) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const data = await new this.videoNoteModel({
        ...dto,
        userId: userObjectId,
      }).save();
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async getNotesByUserId(videoid: string, userid: string) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const data = await this.videoNoteModel
        .find({ videoId: videoid, userId: userObjectId })
        .sort({createdAt:-1 })
        .exec();
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async updateNote(dto: VideoNoteDto, noteid: string,userid:string ) {
    const userObjectId = new Types.ObjectId(userid);
    try {
      const data = await this.videoNoteModel
        .findByIdAndUpdate(
          noteid,
          { $set: {...dto, userId:userObjectId } },
          { new: true, runValidators: true },
        )
        .exec();
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }

  async deleteNote(noteId: string) {
    try {
      const data = await this.videoNoteModel.findByIdAndDelete(noteId).exec();
      return { data: data, err: null };
    } catch (err) {
      return { data: null, err: err };
    }
  }
}

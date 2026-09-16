import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChapterVideoNotesService } from './chapter-video-notes.service';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { VideoNoteDto } from './dto/chaptervideo-note.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('user'))
@Controller('chapter-video-notes')
export class ChapterVideoNotesController {
  constructor(private videoNoteService: ChapterVideoNotesService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createNote(@Body() dto: VideoNoteDto, @getUser() user) {
    dto.createdAt = new Date();
    dto.userId = user.userId;
    dto.updatedAt = new Date();
    const { data, err } = await this.videoNoteService.createNote(
      dto,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('video/:id')
  @HttpCode(HttpStatus.OK)
  async getAllNotesByUser(@Param('id') id: string, @getUser() user) {
    const { data, err } = await this.videoNoteService.getNotesByUserId(
      id,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateNote(
    @Param('id') id: string,
    @Body() dto: VideoNoteDto,
    @getUser() user,
  ) {
    const { data, err } = await this.videoNoteService.updateNote(
      dto,
      id,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNote(@Param('id') id: string) {
    const { data, err } = await this.videoNoteService.deleteNote(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

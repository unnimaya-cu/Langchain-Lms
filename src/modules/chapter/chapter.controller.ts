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
import { ChapterService } from './chapter.service';
import { ChapterDto } from './dto/chapter.dto';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { ChaptercontentService } from '../chaptercontent/chaptercontent.service';
import { Types } from 'mongoose';

@Controller('chapter')
export class ChapterController {
  constructor(
    private chapterService: ChapterService,
    private chapterContentService: ChaptercontentService,
  ) {}

  @UseGuards(AuthGuard('admin'))
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createChapter(@Body() dto: ChapterDto, @getUser() user) {
    const { data, err } = await this.chapterService.createChapter(
      dto,
      user?.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch(':id')
  @HttpCode(HttpStatus.CREATED)
  async updateChapter(
    @Body() updateDto: ChapterDto,
    @getUser() user,
    @Param('id') chapterId: Types.ObjectId,
  ) {
    const { data, err } = await this.chapterService.updateChapter(
      updateDto,
      chapterId,
      user?.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('/status/:id')
  @HttpCode(HttpStatus.OK)
  async chapterStatusChange(@Param('id') id: string) {
    const { data, err } = await this.chapterService.changeChapterStatus(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async chapterDelete(@Param('id') id: string) {
    const { data, err } = await this.chapterService.changeChapterDelete(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard(['user', 'admin']))
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getChapterById(@Param('id') id: string) {
    // console.log('Received chapter ID:', id);

    const { data, err } = await this.chapterService.getChapter(id);

    // console.log('data iss', data);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard(['user', 'admin']))
  @Get('')
  @HttpCode(HttpStatus.OK)
  async getChapters() {
    const { data, err } = await this.chapterService.getAllChapters();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('module/:id')
  @HttpCode(HttpStatus.OK)
  async getChapterByModuleId(@Param('id') id: string,@getUser() user ) {
    const { data, err } = await this.chapterService.getChaptersByModule(id,user.userId, );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // get all chapters by module id for admin
  @UseGuards(AuthGuard('admin'))
  @Get('module/admin/:id')
  @HttpCode(HttpStatus.OK)
  async getChapterByModuleIdAdmin(@Param('id') id: string) {
    const { data, err } =
      await this.chapterService.getChaptersByModuleAdmin(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('chapternames/module/:id')
  @HttpCode(HttpStatus.OK)
  async getChapterByModuleNames(@Param('id') id: string, @getUser() user) {
    const { data, err } = await this.chapterService.getChapterNamesByModule(
      id,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
  //getall- questions and answers based on assessment by chapter
  @UseGuards(AuthGuard(['user', 'admin']))
  @Get('assessment/question/:id')
  @HttpCode(HttpStatus.OK)
  async getAssessmentQuestionByChapterId(@Param('id') id: string) {
    const { data, err } = await this.chapterService.getAssessmentQuestions(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

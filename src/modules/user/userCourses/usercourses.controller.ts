import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsercoursesService } from './usercourses.service';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { UserCoursesDto } from './dto/usercourses.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { ChapterService } from 'src/modules/chapter/chapter.service';

// @UseGuards(AuthGuard('user'))
@Controller('usercourses')
export class UsercoursesController {
  constructor(
    private usercourseService: UsercoursesService,
    private chapterService: ChapterService,
  ) {}

  @UseGuards(AuthGuard('user'))
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createMyLearningCourse(@Body() dto: UserCoursesDto, @getUser() user) {
    //   console.log('current ', user.userId);

    dto.createdAt = new Date();
    dto.userId = user.userId;
    dto.updatedAt = new Date();
    //   dto.updatedBy = user.userId;
    const { data, err } = await this.usercourseService.addMyLearningCourse(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('')
  @HttpCode(HttpStatus.OK)
  async getMylearningCourses(
    @getUser() user,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const { data, err } = await this.usercourseService.getMyLearningCourses(
      user.userId,
      Number(page),
      Number(limit),
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // get user enrolled courses for admin panel
  @UseGuards(AuthGuard('admin'))
  @Get('/admin/enrolledcourses/:id')
  @HttpCode(HttpStatus.OK)
  async enrolledCoursesForAdmin(@Param('id') id: string) {
    const { data, err } =
      await this.usercourseService.enrolledCoursesForAdminPanel(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Patch('chapterstatus/chapter/:id')
  @HttpCode(HttpStatus.OK)
  async updateChapterStatus(
    @Param('id') id: string,
    @Body('courseId') courseId: string,
    @getUser() user,
  ) {
    const { data, err } = await this.usercourseService.updateChapterStatus(
      id,
      user.userId,
      courseId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Patch('progress/chapter/:id')
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @Param('id') id: string,
    @Body('courseId') courseId: string,
    @getUser() user,
  ) {
    const { data, err } =
      await this.usercourseService.updateCompleteChapterStatusAndUpdateProgress(
        id,
        user.userId,
        courseId,
      );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // @Get('chaptercount/course/:id')
  // @HttpCode(HttpStatus.OK)
  // async chapterCountByCourse(@Param('id')id:string ){
  //   const {data,err } = await  this.chapterService.getAllChapterIdByCourse(id)
  //  if(err){
  //   errorResponseBuilder(err)
  //  }
  //  return responseBuilder(true,data )
  // }

  @UseGuards(AuthGuard('user'))
  @Get('completedcourses')
  @HttpCode(HttpStatus.OK)
  async chapterCountByCourse(@getUser() user) {
    const { data, err } = await this.usercourseService.completedCourses(
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // get user completed courses for admin panel
  @UseGuards(AuthGuard('admin'))
  @Get('/admin/completedcourses/:id')
  @HttpCode(HttpStatus.OK)
  async completedCourseForAdminPanel(@Param('id') id: string) {
    const { data, err } =
      await this.usercourseService.completedCoursesForAdmin(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async getUsersByCourse(
    @Param('id') id: string,
    @Query('search') search?: string,
  ) {
    const { data, err } = await this.usercourseService.getUsersByCourse(id, search);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('group')
  @HttpCode(HttpStatus.OK)
  async getUsersForGroup(@Req() req) {
    const { courseId, categoryId, year, month, startIndex, noOfItems, search } = req.body;
    const { data, err } = await this.usercourseService.getUsersForGroup(
      courseId,
      year,
      month,
      startIndex,
      noOfItems,
      search,
    );

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Patch('learning-time/:courseId')
  @HttpCode(HttpStatus.OK)
  async updateLearningTime(
    @Param('courseId') courseId: string,
    @getUser() user
  ) {
    const { data, err } = await this.usercourseService.updateLearningTime(
      courseId,
      user.userId
    );

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

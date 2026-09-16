import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseDto } from './dto/course.dto';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChapterService } from '../chapter/chapter.service';
import { log } from 'console';
// import { Course } from './course.model';
import mongoose from 'mongoose';
import { GetCoursesDto } from './dto/get-courses.dto';
@ApiTags('course')
// @UseGuards(AuthGuard(['admin','user']))
@Controller('course')
export class CourseController {
  constructor(
    private courseService: CourseService,
    private chapterService: ChapterService,
  ) {}

  @Get('topcourses')
  @HttpCode(HttpStatus.OK)
  async getTopRatedCourse() {
    const { data, err } = await this.courseService.topCourse();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create course' })
  async createCourse(@Body() dto: CourseDto, @getUser() user) {
    dto.createdAt = new Date();
    dto.createdBy = user.userId;
    dto.updatedAt = new Date();
    dto.updatedBy = user.userId;

    const { data, err } = await this.courseService.createCourse(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateCourse(
    @getUser() user,
    @Body() dto: CourseDto,
    @Param('id') id: string,
  ) {
    dto.updatedAt = new Date();
    dto.updatedBy = user.userId;
    const { data, err } = await this.courseService.updateCourse(id, dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('admin-courses')
  @HttpCode(HttpStatus.OK)
  async getCoursesForAdmin(
    @Body() dto: GetCoursesDto,
    @getUser() user, 
  ) {
    const { data, err } = await this.courseService.getCoursesForAdmin(
      dto,
      user.userId,
      user.role
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('students')
  @HttpCode(HttpStatus.OK)
  async getCourseStudents(
    // @Param('id') courseId: string,
    @Body() dto: GetCoursesDto,
    @getUser() user, 
  ) {
    const { data, err } = await this.courseService.getCourseStudents(
      // courseId,
      dto,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // admin- all courses
  @UseGuards(AuthGuard('admin'))
  @Post('admincourses')
  @HttpCode(HttpStatus.OK)
  async getAllCoursesByAdmin(
    @Body()
    body: {
      startIndex: number;
      noOfItems: number;
      search: string;
      filter: any;
    },
    @getUser() user, // Get user from JWT payload
  ) {
    const { startIndex, noOfItems, search, filter } = body;

    const { data, err } = await this.courseService.getAllCoursesAdmin(
      startIndex.toString(),
      noOfItems.toString(),
      search,
      filter,
      user.userId, // Pass userId
      user.role,   // Pass role name from JWT payload
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('/status/:id')
  @HttpCode(HttpStatus.OK)
  async courseStatusChange(@Param('id') id: string) {
    const { data, err } = await this.courseService.courseStatusChange(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async courseDelete(@Param('id') id: string) {
    const { data, err } = await this.courseService.courseDelete(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // minimal api for all courses
  @Get('minimal')
  @HttpCode(HttpStatus.OK)
  async getMinimalCourses(@Query('search') search: string) {
    const { data, err } = await this.courseService.getCoursesMinimal(search);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('/:id/list')
  @HttpCode(HttpStatus.OK)
  async getCoursesList(@Param('id') id: string) {
    const { data, err } = await this.courseService.getCoursesList(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('all')
  @HttpCode(HttpStatus.OK)
  async getCourses() {
    const { data, err } =
      await this.courseService.getCourses();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCourseBySlug(@Param('id') id: string) {
    const { data, err } = await this.courseService.getOneCourseById(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('onecourse/:id')
  @HttpCode(HttpStatus.OK)
  async getOneCourseById(@Param('id') id: string, @getUser() user) {
    const { data, err } = await this.courseService.getCourse(user.userId, id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllCourses(
    @Query('startIndex', ParseIntPipe) startIndex: number,
    @Query('noOfItems', ParseIntPipe) noOfItems: number,
    @Query('search') search: string,
    @Query('type') type: string,
    @Query('rating') rating: number,
    @Query('categoryId') categoryId: string,
    @Query('courseLevel') courseLevel: string,
    @getUser() user,
  ) {
    const { data, err } = await this.courseService.getAllCourses(
      type,
      startIndex,
      noOfItems,
      search,
      user.userId,
      rating,
      categoryId,
      courseLevel
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // @UseGuards(AuthGuard('user'))
  @Get('category/:id')
  @HttpCode(HttpStatus.OK)
  async getCourseBycategoryId(@Param('id') id: string) {
    const { data, err } = await this.courseService.getCoursesByCategoryId(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('chapters/:id')
  @HttpCode(HttpStatus.OK)
  async chapterCountByCourse(@Param('id') id: string) {
    const { data, err } =
      await this.chapterService.getTotalChaptersByCourse(id);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  //get course by courseid for admin course details page

  @UseGuards(AuthGuard('admin'))
  @Get('admin/course/:id')
  @HttpCode(HttpStatus.OK)
  async getCourseById(@Param('id') id: string) {
    const { data, err } =
      await this.courseService.getCourseByCourseIdForAdminCourseViewPage(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

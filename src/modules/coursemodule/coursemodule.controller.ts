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
import { CoursemoduleService } from './coursemodule.service';
import { CourseModuleDto } from './dto/coursemodule.dto';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';

@Controller('coursemodule')
export class CoursemoduleController {
  constructor(private courseModuleService: CoursemoduleService) {}

  @UseGuards(AuthGuard('admin'))
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createCourseModule(@Body() dto: CourseModuleDto, @getUser() user) {
    console.log('current ', user.userId);

    dto.createdAt = new Date();
    dto.createdBy = user.userId;
    dto.updatedAt = new Date();
    dto.updatedBy = user.userId;
    const { data, err } =
      await this.courseModuleService.createCourseModule(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateCourseModule(
    @Body() dto: CourseModuleDto,
    @Param('id') id: string,
    @getUser() user,
  ) {
    console.log(
      'new data',
      dto,
      '---------------------',
      dto.updatedChaptersOrders,
    );

    dto.updatedAt = new Date();
    dto.updatedBy = user.userId;
    const { data, err } = await this.courseModuleService.updateCourseModule(
      id,
      dto,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('/status/:id')
  @HttpCode(HttpStatus.OK)
  async changeStatusCourseModule(@Param('id') id: string) {
    const { data, err } =
      await this.courseModuleService.statusChangeCourseModule(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteCourseModule(@Param('id') id: string) {
    const { data, err } = await this.courseModuleService.deleteCourseModule(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard(['user', 'admin']))
  @Get('')
  @HttpCode(HttpStatus.OK)
  async allcourseModules() {
    const { data, err } = await this.courseModuleService.getAllCourseModule();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // get single module by id
  @UseGuards(AuthGuard(['user', 'admin']))
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getcourseModules(@Param() id: string) {
    const { data, err } = await this.courseModuleService.getCourseModule(id);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // get whole module by course id
  @UseGuards(AuthGuard('user'))
  @Get('course/:id')
  @HttpCode(HttpStatus.OK)
  async getModulesbyCourse(@Param() id: string) {
    const { data, err } =
      await this.courseModuleService.getModulesByCourseId(id);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  // get whole module by course id for admin need all deleted and blocked modules
  @UseGuards(AuthGuard('admin'))
  @Get('course/admin/:id')
  @HttpCode(HttpStatus.OK)
  async getModulesbyCourseForAdmin(@Param() id: string) {
    const { data, err } =
      await this.courseModuleService.getModulesByCourseIdForAdmin(id);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard(['user']))
  @Get('course/lastchapter/:id')
  @HttpCode(HttpStatus.OK)
  async getLastChapterWithCourseId(@Param() id: string) {
    const { data, err } =
      await this.courseModuleService.getLastChaptersWithCourseId(id);
    // console.log('data', data);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

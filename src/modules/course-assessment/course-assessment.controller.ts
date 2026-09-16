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
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourseAssessmentService } from './course-assessment.service';
import { ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { CreateCourseAssessmentDto } from './dto/course-assessment.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { UpdateCourseAssessmentDto } from './dto/update-course-assessment.dto';
import { UpdateInstructionsDto } from './dto/update-instructions.dto';

@Controller('course-assessment')
export class CourseAssessmentController {
  constructor(
    private readonly courseassessmentService: CourseAssessmentService,
  ) {}

  @UseGuards(AuthGuard('admin'))
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create course' })
  async createCourseAssessment(
    @Body() dto: CreateCourseAssessmentDto,
    @getUser() user,
  ) {
    const { data, err } = await this.courseassessmentService.createAssessment(
      dto,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get()
  @HttpCode(HttpStatus.OK)
  async getCourseAssessment(
    @Query('tutorId') tutorId?: string,
    @Query('type') type?: string,
    @Query('courseId') courseId?: string,
  ) {
    const { data, err } =
      await this.courseassessmentService.getCourseAssessment(tutorId, type, courseId);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getCourseAssessmentById(@Param('id') assessmentId: string) {
    const { data, err } =
      await this.courseassessmentService.getCourseAssessmentById(assessmentId);

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch(':id')
  async updateAssessment(
    @Param('id') assessmentId: string,
    @Body() dto: UpdateCourseAssessmentDto,
    @getUser() user,
  ) {
    return this.courseassessmentService.updateCourseAssessment(
      assessmentId,
      dto,
      user.userId,
    );
  }

  @UseGuards(AuthGuard('admin'))
  @Delete(':id')
  async softDeleteAssessment(@Param('id') id: string, @getUser() user) {
    return this.courseassessmentService.deleteCourseAssessment(id, user.userId);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('instructions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or edit instructions' })
  async addOrEditInstructions(
    @Param('id') assessmentId: string,
    @Body() dto: UpdateInstructionsDto,
    @getUser() user,
  ) {
    const { data, err } =
      await this.courseassessmentService.addOrEditInstructions(
        assessmentId,
        dto,
        user.userId,
      );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('status/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update assessment status' })
  async updateAssessmentStatus(
    @Param('id') assessmentId: string,
    @getUser() user,
  ) {
    const { data, err } =
      await this.courseassessmentService.updateAssessmentStatus(
        assessmentId,
        user.userId,
      );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

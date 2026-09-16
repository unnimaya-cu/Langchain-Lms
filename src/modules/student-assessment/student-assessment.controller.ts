import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentAssessmentService } from './student-assessment.service';
import { CreateStudentAssessmentDto } from './dto/create-student-assessment.dto';
import { UpdateStudentAssessmentDto } from './dto/update-student-assessment.dto';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { errorResponseBuilder, responseBuilder } from 'src/utils/customErrorBuilder';
import { GetStudentAssessmentsDto } from './dto/getStudentAssessments.dto';

@Controller('student-assessment')
export class StudentAssessmentController {
  constructor(private readonly studentAssessmentService: StudentAssessmentService) {}

  @UseGuards(AuthGuard('admin'))
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(@Body() dto: CreateStudentAssessmentDto, @getUser() user) {
    const { data, err } = await this.studentAssessmentService.create(
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Post('student')
  @HttpCode(HttpStatus.OK)
  async getStudentAssessments(
    // @Param('id') studentId: string,
    @Body() dto:GetStudentAssessmentsDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentAssessmentService.getStudentAssessments(
      
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get('questions/:id')
  @HttpCode(HttpStatus.OK)
  async getAssessmentTypes(
    @Param('id') assessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentAssessmentService.getAssessmentTypes(
      assessmentId,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }
}

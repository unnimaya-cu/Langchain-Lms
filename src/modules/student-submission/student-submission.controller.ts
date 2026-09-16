import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { StudentSubmissionService } from './student-submission.service';
import { CreateStudentSubmissionDto } from './dto/create-student-submission.dto';
import { UpdateStudentSubmissionDto } from './dto/update-student-submission.dto';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { errorResponseBuilder, responseBuilder } from 'src/utils/customErrorBuilder';
import { GetStudentsDto } from './dto/get-students.dto';
import { GetTutorStudentsDto } from './dto/get-tutor-students.dto';
import { StudentTabDto } from './dto/student-tab.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { GetGradebookDto } from './dto/grade-book.dto';

@Controller('student-submission')
export class StudentSubmissionController {
  constructor(private readonly studentSubmissionService: StudentSubmissionService) {}

  @UseGuards(AuthGuard('user'))
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(@Body() dto: CreateStudentSubmissionDto, @getUser() user) {
    const { data, err } = await this.studentSubmissionService.create(
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // @UseGuards(AuthGuard('user'))
  @Get('server-time')
  getServerTime() {
    return {
      serverNow: new Date().toISOString(),
    };
  }

  @UseGuards(AuthGuard('user'))
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateSubmission(
    @Param('id') submissionId: string,
    @Body() dto: UpdateStudentSubmissionDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.update(
      submissionId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Patch('/:id/submit')
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Param('id') submissionId: string,
    @Body() dto: UpdateStudentSubmissionDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.submitAssessment(
      submissionId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('tutor/students')
  @HttpCode(HttpStatus.OK)
  async getStudents(
    // @Param('id') tutorId: string,
    @Body() dto: GetTutorStudentsDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getStudents(
      user.userId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('student-profile/:id')
  @HttpCode(HttpStatus.OK)
  async getStudentProfile(
    @Param('id') studentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getStudentProfile(
      studentId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('student/tab/:id')
  @HttpCode(HttpStatus.OK)
  async getStudentSubmissionsData(
    @Param('id') studentId: string,
    @Body() dto: StudentTabDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getStudentSubmissionsData(
      studentId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('course-details')
  @HttpCode(HttpStatus.OK)
  async getCourseDetails(
    @Body() body: {
      courseId: string,
      studentId: string
    },
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getCourseDetails(
      body.courseId,
      body.studentId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  } 
 
 @UseGuards(AuthGuard('admin'))
  @Post('all-assessments')
  @HttpCode(HttpStatus.OK)
  async getCourseAssessments(
    @Body() dto: StudentTabDto,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getCourseAssessments(
      dto,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('assessment-details/:id')
  @HttpCode(HttpStatus.OK)
  async getAssessmentDetails(
    @Param('id') studentAssessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getAssessmentDetails(
      studentAssessmentId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('pending-submission/:id')
  @HttpCode(HttpStatus.OK)
  async getPendingSubmissionDetails(
    @Param('id') studentAssessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getPendingSubmissionDetails(
      studentAssessmentId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('send-reminder/:id')
  @HttpCode(HttpStatus.OK)
  async sendReminder(
    @Param('id') studentAssessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.sendReminder(
      studentAssessmentId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('submitted-details/:id')
  @HttpCode(HttpStatus.OK)
  async getSubmittedDetails(
    @Param('id') studentAssessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getSubmittedDetails(
      studentAssessmentId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('pending-review/:id')
  @HttpCode(HttpStatus.OK)
  async getPendingReviewDetails(
    @Param('id') submissionId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getPendingReviewDetails(
      submissionId,
      user.userId
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('student/:id')
  @HttpCode(HttpStatus.OK)
  async getStudentSubmissions(
    @Param('id') studentId: string,
    @Body() dto: GetStudentsDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getStudentSubmissions(
      studentId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getSubmissionById(
    @Param('id') submissionId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getSubmissionById(submissionId, user.userId);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('score/:id/assessment')
  @HttpCode(HttpStatus.OK)
  async scoreAssessment(
    @Param('id') studentAssessmentId: string,
    @Body() dto: UpdateScoreDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.scoreAssessment(
      studentAssessmentId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch(':id/score')
  @HttpCode(HttpStatus.OK)
  async scoreQuestion(
    @Param('id') submissionId: string,
    @Body() dto: UpdateStudentSubmissionDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.scoreQuestion(
      submissionId,
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch(':id/calculate-total')
  @HttpCode(HttpStatus.OK)
  async calculateTotalScore(
    @Param('id') submissionId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.calculateTotalScore(
      submissionId,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('user'))
  @Get(':id/view')
  @HttpCode(HttpStatus.OK)
  async viewSubmission(
    @Param('id') submissionId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.viewSubmission(
      submissionId,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('grade-book/courses')
  @HttpCode(HttpStatus.OK)
  async getGradeBookCourses(
    @Body() dto: GetGradebookDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getGradebookCourses(
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('grade-book')
  @HttpCode(HttpStatus.OK)
  async getGradeBook(
    @Body() dto: GetStudentsDto, 
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getGradeBook(
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get(':id/assessment')
  @HttpCode(HttpStatus.OK)
  async getStudentSubmissionQuestions(
    @Param('id') studentAssessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getStudentSubmissionQuestions(
      studentAssessmentId,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('grade-book/details')
  @HttpCode(HttpStatus.OK)
  async getGradebookDetails(
    @Body() dto: GetGradebookDto,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getGradebookDetails(
      dto,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('grade-book/:id/assessment')
  @HttpCode(HttpStatus.OK)
  async getGradebookAssessment(
    @Param('id') studentAssessmentId: string,
    @getUser() user
  ) {
    const { data, err } = await this.studentSubmissionService.getGradebookAssessment(
      studentAssessmentId,
      user.userId,
    );

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }
}

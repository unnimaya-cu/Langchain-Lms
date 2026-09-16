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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { QuestionBankService } from './question-bank.service';
import { QuestionBankDto } from './dto/questionbank.dto';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  responseBuilder,
  errorResponseBuilder,
} from 'src/utils/customErrorBuilder';
import { GetQuestionDto } from './dto/get-questions.dto';

@ApiTags('question-bank')
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionService: QuestionBankService) {}

  // CREATE QUESTION
  @UseGuards(AuthGuard('admin'))
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create Question' })
  async createQuestion(@Body() dto: QuestionBankDto, @getUser() user) {
    // dto.createdBy = user.userId;
    // dto.createdAt = new Date();
    // dto.updatedBy = user.userId;
    // dto.updatedAt = new Date();

    const { data, err } = await this.questionService.create(dto, user.userId);
    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // GET ALL QUESTIONS (ADMIN)
  @UseGuards(AuthGuard('admin'))
  @Post('list')
  @HttpCode(HttpStatus.OK)
  async getAllQuestions(@Body() body: GetQuestionDto) {
    const { data, err } = await this.questionService.findAll(body);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('generate-id')
  @HttpCode(HttpStatus.OK)
  async generateId() {
    const { data, err } = await this.questionService.getId();

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('mcq-questions')
  @HttpCode(HttpStatus.OK)
  async getMcqQuestions(
    @Query('categoryId') categoryId: string,
    @Query('courseId') courseId: string,
    @Query('search') search: string,
  ) {
    const { data, err } = await this.questionService.getMcqQuestions(categoryId, courseId, search);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async getQuestionTypeMetrics() {
    const { data, err } = await this.questionService.getQuestionTypeMetrics();

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // GET QUESTION BY ID
  @UseGuards(AuthGuard('admin'))
  @Get(':id([0-9a-fA-F]{24})')
  @HttpCode(HttpStatus.OK)
  async getQuestionById(@Param('id') id: string) {
    const { data, err } = await this.questionService.findOne(id);
    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // UPDATE QUESTION
  @UseGuards(AuthGuard('admin'))
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update Question' })
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: any,
    @getUser() user,
  ) {
    // dto.updatedBy = user.userId;
    // dto.updatedAt = new Date();
    const { data, err } = await this.questionService.update(
      id,
      dto,
      user.userId,
    );
    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  // DELETE QUESTION
  @UseGuards(AuthGuard('admin'))
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(@Param('id') id: string) {
    const { data, err } = await this.questionService.remove(id);
    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Patch('/status/:id')
  @HttpCode(HttpStatus.OK)
  async userStatusChange(@Param('id') id: string) {
    const { data, err } = await this.questionService.statusChange(id);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('assessment')
  @HttpCode(HttpStatus.OK)
  async getAllQuestionsByCategoryAndCourse(@Body() body: GetQuestionDto) {
    const { data, err } =
      await this.questionService.getAllQuestionsByCategoryAndCourse(body);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }
}

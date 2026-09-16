import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { SubmissionDto } from './dto/submission.dto';
import { SubmissionService } from './submission.service';
import { errorResponseBuilder, responseBuilder } from 'src/utils/customErrorBuilder';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('user'))
@Controller('submission')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createSubmitAnswers(@Body() dto:SubmissionDto,@getUser() user ) {
    dto.createdAt = new Date();
    // dto.createdBy = user.userId;
    dto.updatedAt = new Date();
    // dto.updatedBy = user.userId;
    const {data, err}= await this.submissionService.submitAnswers(dto,user.userId)
    if (err) {
      errorResponseBuilder(err)
    }
    return responseBuilder(true,data)

  }
}

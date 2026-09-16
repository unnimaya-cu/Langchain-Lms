import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { CourseDiscussionService } from './course-discussion.service';
import { QueryDiscussionDto } from './dto/course-discussion.dto';

@UseGuards(AuthGuard('admin'))
@Controller('course-discussion')
export class CourseDiscussionController {
  constructor(
    private readonly courseDiscussionService: CourseDiscussionService,
  ) {}

  @Post()
  async getAllDiscussions(
    @Body() dto: QueryDiscussionDto,
    @getUser() user,
  ) {
    const { data, err } = await this.courseDiscussionService.getAllDiscussionsAdmin(dto, user?.userId,);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async viewDiscussion(@Param('id') discussionId: string) {
    const { data, err } = await this.courseDiscussionService.viewDiscussion(discussionId);

    if (err) {
      return errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async replyDiscussion(
    @Param('id') discussionId: string,
    @Body() body: any,
  ) {
    const { data, err } = await this.courseDiscussionService.replyToDiscussion(
      discussionId,
      body.reply,
    );

    if (err) {
      return errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('flag/:id')
  @HttpCode(HttpStatus.OK)
  async flagDiscussion(
    @Param('id') discussionId: string,
  ) {
    const { data, err } = await this.courseDiscussionService.flagDiscussion(discussionId);

    if (err) {
      return errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('unflag/:id')
  @HttpCode(HttpStatus.OK)
  async unflagDiscussion(
    @Param('id') discussionId: string,
  ) {
    const { data, err } = await this.courseDiscussionService.unflagDiscussion(discussionId);

    if (err) {
      return errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

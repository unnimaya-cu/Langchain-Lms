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
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { Types } from 'mongoose';
import { ChapterVideoCommentService } from './chapter-video-comment.service';
import { CommentDto } from './dto/comment.dto';

@Controller('chapter-video-comment')
export class ChapterVideoCommentController {
  constructor(
    private chapterVideoCommentService: ChapterVideoCommentService,
  ) {}

  @UseGuards(AuthGuard('admin'))
  @Post()
  async getAllFeedbacks(
    @Body() dto: CommentDto,
    @getUser() user
  ) {
    const { data, err } = await this.chapterVideoCommentService.getAllComments(
      dto,
      user.userId
    );
  
    if (err) {
      return errorResponseBuilder(err);
    }
  
    return responseBuilder(true, data);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async viewComment(@Param('id') commentId:string){
    const {data,err } = await this.chapterVideoCommentService.viewComment(commentId)

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async replyComment(
    @Param('id') commentId:string,
    @Body() body:any
  ){
    const {data,err } = await this.chapterVideoCommentService.replyToComment(
      commentId,
      body.reply
    )

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('flag/:id')
  @HttpCode(HttpStatus.OK)
  async flagComment(
    @Param('id') commentId:string,
  ){
    const {data,err } = await this.chapterVideoCommentService.flagComment(
      commentId,
    )

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('unflag/:id')
  @HttpCode(HttpStatus.OK)
  async unflagComment(
    @Param('id') commentId:string,
  ){
    const {data,err } = await this.chapterVideoCommentService.unflagComment(
      commentId,
    )

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

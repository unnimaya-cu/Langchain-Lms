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
  UseGuards,
} from '@nestjs/common';
import { RatingreviewService } from './ratingreview.service';
import { RatingReviewDto } from './dto/ratingreview.dto';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
import { FeedbackDto } from './dto/feedback.dto';

// @UseGuards(AuthGuard('admin'))
@Controller('ratingreview')
export class RatingreviewController {
  constructor(private ratingReviewService: RatingreviewService) { }
  @UseGuards(AuthGuard('admin'))
  @Get('ratinglist')
  async getRatingReview(
    // @Query('startIndex') startIndex: number,
    // @Query('noOfItems') noOfItems: number,
    @Query('page') page:number,
    @Query('limit') limit:number,
    @Query('search') search: string,
  ) {
    try {
      const data = await this.ratingReviewService.getRatingReviewList(
        page,
        search,
        limit,
      );

      return responseBuilder(true, {
        data,
        //totalCount: result.data.totalCount,
      });
    } catch (err) {
      return errorResponseBuilder(err);
    }
  }

  @UseGuards(AuthGuard('user'))
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createRateCourse(@Body() dto: RatingReviewDto, @getUser() user) {
    dto.createdAt = new Date();
    dto.userId = user.userId;

    const { data, err } = await this.ratingReviewService.updateRatingReview(
      dto,
      user.userId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }


  @Get('course/:id')
  @HttpCode(HttpStatus.OK)
  async getRatingCount(@Param() id:string){
    const {data,err } = await this.ratingReviewService.getCourseRatingDistributionPercentage(id)

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }


  // @Get('course/:id')
  // @HttpCode(HttpStatus.OK)
  // async getrating(@Param() id:string) {
  //   const { data, err } = await this.ratingReviewService.getRatingReview(id)

  //   if (err) {
  //     errorResponseBuilder(err);
  //   }
  //   return responseBuilder(true, data);
  // }

  @UseGuards(AuthGuard('admin'))
  @Post('feedback')
  async getAllFeedbacks(
    @Body() dto: FeedbackDto,
    @getUser() user
  ) {
      const { data, err } = await this.ratingReviewService.getAllFeedbacks(
       dto,
       user.userId
      );

      if (err) {
        return errorResponseBuilder(err);
      }

      return responseBuilder(true, data);
  }

  @Get('feedback/:id')
  @HttpCode(HttpStatus.OK)
  async viewFeedback(@Param('id') feedbackId:string){
    const {data,err } = await this.ratingReviewService.viewFeedback(feedbackId)

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('feedback/:id')
  @HttpCode(HttpStatus.OK)
  async replyFeedback(
    @Param('id') feedbackId:string,
    @Body() body: any,
    // @getUser() user
  ){
    const {data,err } = await this.ratingReviewService.replyFeedback(
      feedbackId,
      body.reply,
      // user.userId
    )

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('feedback/flag/:id')
  @HttpCode(HttpStatus.OK)
  async flagFeedback(
    @Param('id') feedbackId:string,
  ){
    const {data,err } = await this.ratingReviewService.flagFeedback(
      feedbackId,
    )

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Patch('feedback/unflag/:id')
  @HttpCode(HttpStatus.OK)
  async unflagFeedback(
    @Param('id') feedbackId:string,
  ){
    const {data,err } = await this.ratingReviewService.unflagFeedback(
      feedbackId,
    )

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

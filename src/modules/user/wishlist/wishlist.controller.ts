import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  Query
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { WishlistDto } from './dto/wishlist.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';
// import { Query } from 'mongoose';

@UseGuards(AuthGuard('user'))
@Controller('wishlist')
export class WishlistController {
  constructor(private wishListService: WishlistService) {}
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createWishlistCourse(@Body() dto: WishlistDto, @getUser() user) {
    dto.createdAt = new Date();
    dto.userId = user.userId;

    const { data, err } = await this.wishListService.addWishlistCourse(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
  @Delete(':courseId')
  @HttpCode(HttpStatus.OK)
  async removeWishlistCourse(
    @Param('courseId') courseId: string,
    @getUser() user,
  ) {
    const { data, err } = await this.wishListService.removeWishlistCourse(
      user.userId,
      courseId,
    );
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllWishlistCourses(
    @getUser() user, 
    @Query('page') page = '1',
    @Query('limit') limit = '10',
) {
    const { data, err } = await this.wishListService.getWishlistCourses(
      user.userId,
      Number(page),
      Number(limit),
    );

    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

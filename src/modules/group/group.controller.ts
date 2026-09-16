import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AuthGuard } from '@nestjs/passport';
import { getUser } from 'src/common/decorators/userdecorator/user.decorator';
import { errorResponseBuilder, responseBuilder } from 'src/utils/customErrorBuilder';
import { response } from 'express';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @UseGuards(AuthGuard('admin'))
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(@Body() dto: CreateGroupDto, @getUser() user) {
    const { data, err } = await this.groupService.createGroup(dto, user.userId);

    if (err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }

  @UseGuards(AuthGuard('admin'))
  @Post('list')
  @HttpCode(HttpStatus.OK)
  async getGroups(@Body() body: any) {
    const {categoryId, courseId, startIndex, noOfItems, search} = body
    const {data, err} = await this.groupService.getGroups(
      courseId,
      categoryId,
      startIndex,
      noOfItems,
      search
    )

    if(err) {
      return errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }
}

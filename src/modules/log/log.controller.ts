import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogService } from './log.service';
// import {
//     errorResponseBuilder,
//     responseBuilder,
//   } from "src/utils/response-builder";
import { GetActivityLogDto } from "./dto/get-log.dto"

@Controller('log')
// @UseGuards(UserGuard)
export class LogController {
  constructor(private logModuleService: LogService) {}

  @Get()
  async getActivityLogs(@Query() query: GetActivityLogDto) {
    const { end_date, page, perPage, search, start_date, user_id } = query;
    const response = await this.logModuleService.getActivityLogs(
      page,
      perPage,
      search,
      start_date,
      end_date,
      user_id,
    );
    // if (response.error) {
    //   return errorResponseBuilder(response);
    // }
    // return responseBuilder(response);
  }
}


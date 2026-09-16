import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AdmindashboardService } from './admindashboard.service';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';
import { AuthGuard } from '@nestjs/passport';

@Controller('admindashboard')
export class AdmindashboardController {
  constructor(private admindashboardService: AdmindashboardService) {}

  @UseGuards(AuthGuard('admin'))
  @Get('')
  @HttpCode(HttpStatus.OK)
  async dashboardData() {
    const { data, err } =
      await this.admindashboardService.getAdminDashboardData();

    if (err) {
      errorResponseBuilder(err);
    }

    return responseBuilder(true, data);
  }
}

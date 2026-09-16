import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SubscribeService } from './subscribe.service';
import { CreateSubscribeDto } from './dto/subscribe.dto';
import {
  errorResponseBuilder,
  responseBuilder,
} from 'src/utils/customErrorBuilder';

@Controller('subscribe')
export class SubscribeController {
  constructor(private subscribeService: SubscribeService) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  async createSubscribers(@Body() dto: CreateSubscribeDto) {
    // dto.roleCreatedAt = new Date();
    // dto.roleUpdatedAt = new Date();

    console.log(' dto', dto);

    const { data, err } = await this.subscribeService.subscribe(dto);
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  async getAllSubscribers() {
    const { data, err } = await this.subscribeService.getAllSubscribers();
    if (err) {
      errorResponseBuilder(err);
    }
    return responseBuilder(true, data);
  }
}

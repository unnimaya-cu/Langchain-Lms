import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/health")
  // @UseInterceptors(LoggerInterceptor)
  getHello(): string {
    return this.appService.getHello();
  }
}

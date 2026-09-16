import { Controller } from '@nestjs/common';
import { AnswerOptionsService } from './answer-options.service';

// @UseGuards(AuthGuard('user'))
@Controller('answer-options')
export class AnswerOptionsController {
  constructor(private answerOptionService: AnswerOptionsService) {}

  //   @Post('')
  //   @HttpCode(HttpStatus.CREATED)
  //   async createChapter(@Body() dto:AnswerOptionDto []  {

  //     console.log("opdto----",dto );

  //     const processedOptions = dto.map((option) => ({
  //         ...option,
  //         createdAt: new Date(),
  //         updatedAt: new Date(),
  //         createdBy: "",
  //         updatedBy: ""
  //       }));

  //     const { data, err } = await this.answerOptionService.createAnswer(processedOptions)
  //     if (err) {
  //       errorResponseBuilder(err);
  //     }
  //     return responseBuilder(true, data);
  //   }
}

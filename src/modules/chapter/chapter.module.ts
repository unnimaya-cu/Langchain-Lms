import { Module } from '@nestjs/common';
import { ChapterController } from './chapter.controller';
import { ChapterService } from './chapter.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { ChaptercontentService } from '../chaptercontent/chaptercontent.service';
import { AssessmentService } from '../assessment/assessment.service';
import { AssessmentQuestionsService } from '../assessment-questions/assessment-questions.service';
import { AnswerOptionsService } from '../answer-options/answer-options.service';
import { ChapterVideoService } from '../chapter-video/chapter-video.service';

@Module({
  imports:[MongodbModule],
  providers:[ChapterService,ChaptercontentService,AssessmentService,AssessmentQuestionsService,AnswerOptionsService,ChapterVideoService],
  controllers: [ChapterController],
  exports:[]
})
export class ChapterModule {}

import { Module } from '@nestjs/common';
import { CoursemoduleController } from './coursemodule.controller';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { CoursemoduleService } from './coursemodule.service';
import { ChapterService } from '../chapter/chapter.service';
import { AnswerOptionsService } from '../answer-options/answer-options.service';
import { AssessmentQuestionsService } from '../assessment-questions/assessment-questions.service';
import { AssessmentService } from '../assessment/assessment.service';
import { ChapterVideoService } from '../chapter-video/chapter-video.service';
import { ChaptercontentService } from '../chaptercontent/chaptercontent.service';

@Module({
  imports: [MongodbModule],
  providers: [
    CoursemoduleService,
    ChapterService,
    ChaptercontentService,
    AssessmentService,
    AssessmentQuestionsService,
    AnswerOptionsService,
    ChapterVideoService,
  ],
  controllers: [CoursemoduleController],
})
export class CoursemoduleModule {}

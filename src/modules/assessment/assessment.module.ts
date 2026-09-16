import { Module } from '@nestjs/common';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';
import { AssessmentQuestionsService } from '../assessment-questions/assessment-questions.service';
import { AnswerOptionsService } from '../answer-options/answer-options.service';
import { AssessmentService } from './assessment.service';

@Module({
  imports:[MongodbModule],
  providers:[AssessmentQuestionsService,AnswerOptionsService,AssessmentService],
  controllers: [],
  exports:[AssessmentModule]
})
export class AssessmentModule {}

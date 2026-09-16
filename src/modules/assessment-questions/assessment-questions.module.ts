import { Module } from '@nestjs/common';
import { AssessmentQuestionsController } from './assessment-questions.controller';
import { AssessmentQuestionsService } from './assessment-questions.service';
import { MongodbModule } from 'src/database/mongodb/mongodb.module';

@Module({
  imports:[MongodbModule],
  providers:[AssessmentQuestionsService],
  controllers: [AssessmentQuestionsController],
  exports:[AssessmentQuestionsService]
})
export class AssessmentQuestionsModule {}

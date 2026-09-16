import { Module } from '@nestjs/common';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseAssessment, CourseAssessmentSchema } from './schema/course-assessment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {name: CourseAssessment.name, schema: CourseAssessmentSchema}
    ]),
    QuestionBankModule
  ],
  exports:[MongooseModule],
})
export class CourseAssessmentModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionBankController } from './question-bank.controller';
import { QuestionBankService } from './question-bank.service';
import { QuestionBank, QuestionBankSchema } from './schema/questionbank.schema';
import { McqQuestionSchema } from './schema/mcq.schema';
import { TrueFalseQuestionSchema } from './schema/true-false.schema';
import { MiscModule } from '../misc/misc.module';
import { FillBlankQuestionSchema } from './schema/fill-blank.schema';
import { EssayQuestionSchema } from './schema/essay.schema';
// import { CodeQuestionSchema } from './schema/code.schema';
// import { FileUploadQuestionSchema } from './schema/file-upload.schema';
import { AssignmentQuestionSchema } from './schema/assignment.schema';
import { ShortAnswerQuestionSchema } from './schema/short-answer.schema';
@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: QuestionBank.name,
        useFactory: () => {
          const schema = QuestionBankSchema;

          schema.discriminator('mcq', McqQuestionSchema);
          schema.discriminator('true_false', TrueFalseQuestionSchema);
          schema.discriminator('fill_blank', FillBlankQuestionSchema);
          schema.discriminator('essay', EssayQuestionSchema);
          // schema.discriminator('code', CodeQuestionSchema);
          // schema.discriminator('file_upload', FileUploadQuestionSchema);
          schema.discriminator('assignment', AssignmentQuestionSchema);
          schema.discriminator('short_answer', ShortAnswerQuestionSchema);

          return schema;
        },
      },
    ]),
    MiscModule,
  ],
  controllers: [QuestionBankController],
  providers: [QuestionBankService],
  exports: [MongooseModule],
})
export class QuestionBankModule {}

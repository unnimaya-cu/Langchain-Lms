import { PartialType } from '@nestjs/mapped-types';
import { QuestionBankDto } from './questionbank.dto';

export class UpdateQuestionBankDto extends PartialType(QuestionBankDto) {}

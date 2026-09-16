// import {
//   IsString,
//   IsEnum,
//   IsNumber,
//   IsOptional,
//   IsArray,
//   Min,
// } from 'class-validator';
// import { DifficultyType } from 'src/common/enum/difficulty-type.enum';
// import { QuestionType } from 'src/common/enum/question-type.enum';

import { ValidateIf, ValidateNested } from 'class-validator';
import { CreateQuestionBaseDto } from './question-base.dto';
import { QuestionType } from 'src/common/enum/question-type.enum';
import { Type } from 'class-transformer';
import { CreateMcqQuestionDto } from './mcq.dto';
import { CreateTrueFalseQuestionDto } from './true-false.dto';
import { CreateFillBlankQuestionDto } from './fill-blank.dto';
import { CreateEssayQuestionDto } from './essay.dto';
// import { CreateCodeQuestionDto } from './code.dto';
// import { CreateFileUploadQuestionDto } from './file-upload.dto';
import { CreateAssignmentQuestionDto } from './assignment.dto';
import { CreateShortAnswerQuestionDto } from './short-answer.dto';

// export class QuestionBankDto {

//   @IsString()
//   @IsOptional()
//   questionText: string;

//   @IsEnum(QuestionType)
//   @IsOptional()
//   questionType?: QuestionType;

//   @IsEnum(DifficultyType)
//   @IsOptional()
//   difficulty?: DifficultyType;

//   @IsNumber()
//   @Min(1)
//   @IsOptional()
//   points?: number;

//   @IsArray()
//   @IsString({ each: true })
//   @IsOptional()
//   tags?: string[];

//   createdAt?: Date;

//   updatedAt?: Date;

//   createdBy?: string;

//   updatedBy?: string;
// }

export class QuestionBankDto extends CreateQuestionBaseDto {
  @ValidateIf((o) => o.questionType === QuestionType.MCQ)
  @ValidateNested()
  @Type(() => CreateMcqQuestionDto)
  mcq?: CreateMcqQuestionDto;

  @ValidateIf((o) => o.questionType === QuestionType.TRUE_FALSE)
  @ValidateNested()
  @Type(() => CreateTrueFalseQuestionDto)
  trueFalse?: CreateTrueFalseQuestionDto;

  @ValidateIf((o) => o.questionType === QuestionType.FILL_BLANK)
  @ValidateNested()
  @Type(() => CreateFillBlankQuestionDto)
  fillBlank?: CreateFillBlankQuestionDto;

  @ValidateIf((o) => o.questionType === QuestionType.ESSAY)
  @ValidateNested()
  @Type(() => CreateEssayQuestionDto)
  essay?: CreateEssayQuestionDto;

  // @ValidateIf((o) => o.questionType === QuestionType.CODE)
  // @ValidateNested()
  // @Type(() => CreateCodeQuestionDto)
  // code?: CreateCodeQuestionDto;

  // @ValidateIf((o) => o.questionType === QuestionType.FILE_UPLOAD)
  // @ValidateNested()
  // @Type(() => CreateFileUploadQuestionDto)
  // fileUpload?: CreateFileUploadQuestionDto;

  @ValidateIf((o) => o.questionType === QuestionType.ASSIGNMENT)
  @ValidateNested()
  @Type(() => CreateAssignmentQuestionDto)
  assignment?: CreateAssignmentQuestionDto;

  @ValidateIf((o) => o.questionType === QuestionType.SHORT_ANSWER)
  @ValidateNested()
  @Type(() => CreateShortAnswerQuestionDto)
  shortAnswer?: CreateShortAnswerQuestionDto;
}

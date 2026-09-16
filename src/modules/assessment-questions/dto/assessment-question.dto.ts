import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { AnswerOptionDto } from 'src/modules/answer-options/dto/answer-option.dto';

export class AssessmentQuestionDto {
  @IsOptional()
  @IsString()
  questionId: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  questionTitle: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  options: AnswerOptionDto[];

  assessmentId:Types.ObjectId

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

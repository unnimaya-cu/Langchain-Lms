import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Types } from 'mongoose';
import { AssessmentQuestionDto } from 'src/modules/assessment-questions/dto/assessment-question.dto';

export class AssessmentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  // @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  isReqAssessment:boolean


  @IsNotEmpty()
  @IsArray()
  @Type(() => AssessmentQuestionDto)
  @ValidateNested({ each: true })
  questions: AssessmentQuestionDto[]

  @IsOptional()
  @IsArray()
  @IsString( {each:true})
  deletedQuestions:Types.ObjectId[]

  // @IsString()
  // @IsNotEmpty()
  duration?: string;

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;


  updatedBy?: string;
}

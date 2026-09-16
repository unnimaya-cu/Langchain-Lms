import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
} from 'class-validator';

class AssignmentAnswerDto {
  @IsString()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateAssignmentQuestionDto {
  @IsBoolean()
  @IsOptional()
  oneOrMultipleAnswers: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleChoices: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalFiles?: string[];

  @IsString()
  @IsOptional()
  inputBoxSize: string;

  @IsNumber()
  @IsOptional()
  maxNoOfUploadedFiles: number;

  @IsString()
  @IsOptional()
  maxSubmissionSize: string;

  @IsOptional()
  @IsBoolean()
  isMaxLimitEnabled: boolean;

  @IsString()
  @IsOptional()
  maxWords: string;

  @IsOptional()
  @IsBoolean()
  isMinLimitEnabled: boolean;

  @IsString()
  @IsOptional()
  minWords: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentAnswerDto)
  answers: AssignmentAnswerDto[];
}

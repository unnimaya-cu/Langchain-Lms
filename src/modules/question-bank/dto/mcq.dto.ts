import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class McqAnswerDto {
  @IsString()
  choice: string;

  @IsString()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsBoolean()
  @IsOptional()
  isAnswer: boolean;
}

export class CreateMcqQuestionDto {
  @IsBoolean()
  @IsNotEmpty()
  oneOrMultipleAnswers: boolean;

  @IsBoolean()
  @IsOptional()
  shuffleChoices: boolean;

  @IsBoolean()
  @IsOptional()
  showHints: boolean;

  @IsNumber()
  @IsNotEmpty()
  noOfChoices: number;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => McqAnswerDto)
  answers: McqAnswerDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];

  // @IsOptional()
  // @IsNumber()
  // penalty?: number;
}

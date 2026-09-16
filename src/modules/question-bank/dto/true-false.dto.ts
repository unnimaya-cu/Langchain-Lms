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

class TrueFalseAnswerDto {
  @IsString()
  @IsOptional()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsBoolean()
  @IsNotEmpty()
  correctAnswer: boolean;
}

export class CreateTrueFalseQuestionDto {
  @IsBoolean()
  @IsOptional()
  oneOrMultipleAnswers: boolean;

  @IsBoolean()
  @IsOptional()
  shuffleChoices: boolean;

  @IsNumber()
  @IsOptional()
  noOfChoices: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrueFalseAnswerDto)
  answers: TrueFalseAnswerDto[];
}

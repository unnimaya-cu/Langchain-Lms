import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CodeAnswerDto {
  @IsString()
  choice: string;

  @IsNumber()
  grade: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateCodeQuestionDto {
  @IsBoolean()
  oneOrMultipleAnswers: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleChoices: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeAnswerDto)
  answers: CodeAnswerDto[];
}

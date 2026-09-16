import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ShortAnswerDto {
  @IsString()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateShortAnswerQuestionDto {
  @IsBoolean()
  @IsOptional()
  oneOrMultipleAnswers: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleChoices: boolean;

  @IsString()
  @IsOptional()
  inputBoxSize: string;

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
  @Type(() => ShortAnswerDto)
  answers: ShortAnswerDto[];
}

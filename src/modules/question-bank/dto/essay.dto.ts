import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class EssayAnswerDto {
  @IsString()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateEssayQuestionDto {
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

  @IsOptional()
  @IsBoolean()
  allowAttachments: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EssayAnswerDto)
  answers: EssayAnswerDto[];
}

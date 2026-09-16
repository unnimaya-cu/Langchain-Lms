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

class PlaceholderDto {
  @IsNumber()
  @IsNotEmpty()
  placeholderIndex: number;

  @IsArray()
  @IsString({ each: true })
  choices: string[];

  @IsString()
  @IsOptional()
  grade: string;
}

class FillBlankAnswerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaceholderDto)
  placeholders: PlaceholderDto[];

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateFillBlankQuestionDto {
  @IsBoolean()
  @IsOptional()
  oneOrMultipleAnswers: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleChoices: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FillBlankAnswerDto)
  answers: FillBlankAnswerDto[];
}

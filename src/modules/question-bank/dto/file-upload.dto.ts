import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class FileUploadAnswerDto {
  @IsString()
  choice: string;

  @IsNumber()
  grade: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class CreateFileUploadQuestionDto {
  @IsBoolean()
  oneOrMultipleAnswers: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleChoices: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileUploadAnswerDto)
  answers: FileUploadAnswerDto[];
}

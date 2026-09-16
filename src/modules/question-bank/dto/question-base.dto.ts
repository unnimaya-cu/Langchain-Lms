import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { DifficultyType } from 'src/common/enum/difficulty-type.enum';
import { GradingMethod } from 'src/common/enum/grading-method';
import { QuestionType } from 'src/common/enum/question-type.enum';
export class CreateQuestionBaseDto {
  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @IsMongoId()
  // @IsNotEmpty()
  @IsOptional()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  questionName: string;

  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsNotEmpty()
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsEnum(DifficultyType)
  difficulty: DifficultyType;

  @IsBoolean()
  @IsOptional()
  showInstructions?: boolean;

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  idNumber?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsEnum(GradingMethod)
  @IsOptional()
  gradingMethod: GradingMethod;

  // @IsString()
  // @IsNotEmpty()
  // questionCode: string;

  @IsOptional()
  @IsDate()
  lastUsed?: Date;

  @IsMongoId()
  @IsOptional()
  lastUsedBy?: string;
}

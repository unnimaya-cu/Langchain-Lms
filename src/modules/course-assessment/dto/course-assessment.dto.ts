import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsNotEmpty,
  IsArray,
  IsMongoId,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { AssessmentType } from '../../../common/enum/assessment-type.enum';
import { Type } from 'class-transformer';

class InstructionsDto {
  @IsBoolean()
  @IsOptional()
  enableSubmissionFrom?: boolean;

  @IsDateString()
  @IsOptional()
  submissionFrom?: Date;

  @IsBoolean()
  @IsOptional()
  enableDueDate?: boolean;

  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @IsBoolean()
  @IsOptional()
  enableLastSubmissionDate?: boolean;

  @IsDateString()
  @IsOptional()
  lastSubmissionDate?: Date;

  @IsBoolean()
  @IsOptional()
  enableGradeReminder?: boolean;

  @IsDateString()
  @IsOptional()
  gradeReminderDate?: Date;

  @IsBoolean()
  @IsOptional()
  requireSubmitButton?: boolean;

  @IsNumber()
  @IsOptional()
  allowedAttempts?: number;

  @IsBoolean()
  @IsOptional()
  notifyStudentOnAssignment?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyStudentOnGrading?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyStudentOnReminder?: boolean;

  @IsNumber()
  @IsOptional()
  maximumGrade?: number;

  @IsBoolean()
  @IsOptional()
  hideGraderIdentity?: boolean;

  @IsEnum(['none', 'manual'])
  @IsOptional()
  completionCondition?: 'none' | 'manual';

  @IsBoolean()
  @IsOptional()
  enableTimelineReminder?: boolean;

  @IsDateString()
  @IsOptional()
  timelineReminderDate?: Date;
}

export class CreateCourseAssessmentDto {
  @IsNotEmpty()
  @IsString()
  //   @MaxLength(150)
  title: string;

  @IsMongoId()
  @IsNotEmpty()
  courseId: string;

  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(AssessmentType)
  @IsNotEmpty()
  assessmentType: AssessmentType;

  @IsNotEmpty()
  @IsArray()
  questions: any[];

  @IsOptional()
  @IsBoolean()
  shuffleChoices?: boolean;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  groupIds?: string[];

  @ValidateNested()
  @Type(() => InstructionsDto)
  @IsOptional()
  instructions?: InstructionsDto;
}

import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class UpdateInstructionsDto {
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

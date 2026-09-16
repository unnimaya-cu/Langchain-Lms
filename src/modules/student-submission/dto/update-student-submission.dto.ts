import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentSubmissionDto } from './create-student-submission.dto';
import { IsArray, IsBoolean, IsDate, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateStudentSubmissionDto extends PartialType(CreateStudentSubmissionDto) {
  @IsMongoId()
  @IsOptional()
  questionId: string;

  @IsString()
  @IsOptional()
  questionType?: string;

  @IsArray()
  @IsOptional()
  selectedChoices?: string[];

  @IsString()
  @IsOptional()
  text?: string;

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsBoolean()
  @IsOptional()
  correctAnswer?: boolean; 

  @IsNumber()
  @IsOptional()
  score?: number;

  @IsString()
  @IsOptional()
  manualScore: string;

  @IsNumber()
  @IsOptional()
  objectiveScore?: number;

  @IsNumber()
  @IsOptional()
  subjectiveScore?: number;

  @IsNumber()
  @IsOptional()
  totalMarksObtained?: number;
  
  @IsNumber()
  @IsOptional()
  totalMarks?: number;
  
  @IsNumber()
  @IsOptional()
  subjectiveMarksObtained?: number;
  
  @IsNumber()
  @IsOptional()
  totalSubjectiveMarks?: number;
  
  @IsNumber()
  @IsOptional()
  objectiveMarksObtained?: number;
  
  @IsNumber()
  @IsOptional()
  totalObjectiveMarks?: number;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsArray()
  @IsOptional()
  placeholders?: { 
    placeholderIndex: number; 
    choices: string[]; 
  }[];

  @IsDate()
  @IsOptional()
  submittedAt?: Date;

  @IsBoolean()
  @IsOptional()
  isGraded?: boolean;

  @IsMongoId()
  @IsOptional()
  gradedBy?: string;

  @IsDate()
  @IsOptional()
  gradedAt?: Date;

  @IsBoolean()
  @IsOptional()
  isAutoSubmit?: boolean;
}

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateStudentAssessmentDto {
  @IsNotEmpty()
  @IsMongoId()
  categoryId: string;

  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsNotEmpty()
  @IsMongoId()
  assessmentId: string;

  @ValidateIf((o) => !o.groupId)
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  studentIds: string[];

  // @IsOptional()
  // @IsMongoId()
  // groupId: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  groupIds: string[];

  @IsOptional()
  @IsBoolean()
  isFromGroup: boolean;

  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  dueDate: Date;
}
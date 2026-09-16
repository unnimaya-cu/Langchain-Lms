import { IsMongoId, IsNotEmpty, IsString, IsEnum, IsArray, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { StudentSubmissionStatus } from 'src/common/enum/student-submission.enum';


export class CreateStudentSubmissionDto {
  @IsMongoId()
  @IsNotEmpty()
  assessmentId: string;

  @IsMongoId()
  @IsOptional()
  studentAssessmentId?: string;

  @IsMongoId()
  @IsOptional()
  chapterId?: string;

  // @IsMongoId()
  // @IsNotEmpty()
  // studentId: string;

  @IsOptional()
  questionSnapshot?: any[];
}
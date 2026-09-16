import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class QuestionOption {
  @ApiProperty()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty()
  @IsNotEmpty()
  selectedAnswer: string;
}
export class SubmissionDto {
  @ApiProperty()
  @IsNotEmpty()
  assessmentId: string;

  // @ApiProperty()
  // @IsNotEmpty()
  // userId: string;

  @ApiProperty({
    description: 'Array of question options with questionId and selectedAnswer',
    type: [QuestionOption],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOption)
  @IsNotEmpty()
  questionOptions: QuestionOption[];

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

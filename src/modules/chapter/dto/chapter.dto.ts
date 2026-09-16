import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ChapterType } from 'src/common/enum/chapter-type.enum';
import { AssessmentQuestionDto } from 'src/modules/assessment-questions/dto/assessment-question.dto';
import { AssessmentDto } from 'src/modules/assessment/dto/assessment.dto';
import { ChapterVidoeDto } from 'src/modules/chapter-video/dto/chapterVidoe.dto';
import { ChapterContentDto } from 'src/modules/chaptercontent/dto/chaptercontent.dto';

export class ChapterDto {
  @ApiProperty()
  @IsNotEmpty()
  moduleId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(ChapterType)
  chapterType: ChapterType;

  @ApiProperty()
  @ValidateIf((data) => data.chapterType === ChapterType.CONTENT)
  @IsNotEmpty()
  @Type(() => ChapterContentDto)
  @ValidateNested({ each: true })
  content: ChapterContentDto;

  @ApiProperty()
  @ValidateIf((data) => data.chapterType === ChapterType.ASSESSMENT)
  @IsNotEmpty()
  @Type(() => AssessmentDto)
  @ValidateNested({ each: true })
  assessment: AssessmentDto;

  @ApiProperty()
  @ValidateIf((data) => data.chapterType === ChapterType.VIDEO)
  @IsNotEmpty()
  @Type(() => ChapterVidoeDto)
  @ValidateNested({ each: true })
  video: ChapterVidoeDto;

  @ApiProperty()
  @ValidateIf((data) => data.chapterType === ChapterType.COURSE_ASSESSMENT)
  @IsNotEmpty()
  @IsMongoId()
  courseAssessmentId: string;

  @IsNumber()
  @IsOptional()
  durationInSec?:number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

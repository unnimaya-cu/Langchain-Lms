import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  isURL,
  ValidateNested,
} from 'class-validator';
import { CourseLevel } from 'src/common/enum/courseLevel.enum';
import { CourseStatusType } from 'src/common/enum/coursestatus-type.enum';
import { PaymentStatusType } from 'src/common/enum/paymentstatus-type.enum';

interface updatedModulesOrders {
  _id: string;
  moduleOrder: number;
}

class PreviewDto {
  @ApiProperty()
  @IsString()
  previewType: string;

  @ApiProperty()
  @IsString()
  url: string;
}

export class CourseDto {
  courseCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  // @isURL()
  courseImg?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  // @isURL()
  coverImg?: string;

  @IsNotEmpty()
  @IsEnum(CourseLevel)
  courseLevel: CourseLevel;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsNotEmpty()
  @IsEnum(PaymentStatusType)
  isPaid?: PaymentStatusType;

  @ApiProperty()
  @IsNotEmpty()
  // @IsMongoId()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsOptional()
  @IsMongoId()
  rating?: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsEnum(CourseStatusType)
  status?: CourseStatusType;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courseTags?: string[];

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skillsGain?: string[];

  // @ApiProperty()
  // @IsOptional()
  // @IsArray()
  // @IsString({ each: true })
  // preview?: string[];
  @ApiProperty({
  required: false,
    type: () => [PreviewDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviewDto)
  preview?: PreviewDto[];

  @IsOptional()
  @IsArray()
  updatedModulesOrders?: updatedModulesOrders[];

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

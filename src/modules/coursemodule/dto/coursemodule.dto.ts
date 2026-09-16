import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

interface updatedChaptersOrders {
  _id: string;
  orderNumber: number;
}

export class CourseModuleDto {
  @IsNotEmpty()
  @IsOptional()
  title: string;

  // @IsNotEmpty()
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  duration: string;

  // @IsNotEmpty()
  moduleOrder: number;

  @IsNotEmpty()
  courseId: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedAt?: Date;

  @IsOptional()
  @IsMongoId()
  createdBy?: string;

  @IsOptional()
  @IsMongoId()
  updatedBy?: string;

  @IsOptional()
  @IsArray()
  updatedChaptersOrders?: updatedChaptersOrders[];
}

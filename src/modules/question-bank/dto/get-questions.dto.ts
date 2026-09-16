import { IsNumber, IsOptional, IsString } from 'class-validator';

export class GetQuestionDto {
  @IsNumber()
  @IsOptional()
  startIndex?: number;

  @IsNumber()
  @IsOptional()
  noOfItems?: number;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @IsString()
  questions?: string;
}

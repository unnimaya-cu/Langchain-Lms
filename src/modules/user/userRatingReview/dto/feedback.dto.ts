import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class FeedbackDto {
  @IsNotEmpty()
  @IsNumber()
  page: number = 1;

  @IsOptional()
  @IsNumber()
  limit: number = 10;

  @IsNotEmpty()
  @IsString()
  tab: string = 'all';

  @IsOptional()
  @IsString()
  courseId: string = 'all';

  @IsString()
  @IsOptional()
  categoryId: string = 'all';

  @IsOptional()
  @IsString()
  rating: string = 'all';

  @IsString()
  @IsOptional()
  sortBy: string = 'newestFirst';

  @IsString()
  @IsOptional()
  search: string;

  @IsString()
  @IsOptional()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate: string;
}

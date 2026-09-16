import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetCoursesDto {
  @IsNotEmpty()
  @IsNumber()
  page: number = 1;

  @IsOptional()
  @IsNumber()
  limit: number = 10;

  @IsNotEmpty()
  @IsString()
  tab: string = 'all';

  @IsString()
  @IsOptional()
  search: string;

  @IsString()
  @IsOptional()
  categoryId: string = 'all';

  @IsOptional()
  @IsString()
  courseId: string = 'all';

  @IsString()
  @IsOptional()
  status: string = 'all';

  @IsString()
  @IsOptional()
  sortBy: string;
}

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CourseDiscussionDto {
  @IsNotEmpty()
  @IsString()
  courseId: string;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];

  @IsString()
  @IsOptional()
  reply: string;

  @IsString()
  @IsOptional()
  previousState: string;

  repliedOn?: Date;
}

export class ReplyDiscussionDto {
  @IsNotEmpty()
  @IsString()
  parentId: string;

  @IsNotEmpty()
  @IsString()
  courseId: string;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];
}

export class QueryDiscussionDto {
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

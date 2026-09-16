import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RatingReviewDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  courseId: string;

  @IsNotEmpty()
  @IsNumber()
  rating: number;

  @IsString()
  @IsOptional()
  review: string;

  @IsString()
  @IsOptional()
  reply: string;

  @IsString()
  @IsOptional()
  previousState: string;

  userId?: string;

  createdAt?: Date;
  repliedOn?: Date;

  updatedAt?: Date;
}

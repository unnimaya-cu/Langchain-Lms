import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserCoursesDto {
  @ApiProperty()
  @IsNotEmpty()
  courseId: string;

  // @ApiProperty()
  // @IsNotEmpty()
  userId: string;

  createdAt?: Date;

  updatedAt?: Date;

  lastActivityAt?: Date;

  lastReminderSentAt?: Date | null;

  // createdBy?: string;

  // updatedBy?: string;
}
export class UpdateProgressDto {

  @IsNotEmpty()
  @IsString()
  chapterId: string;
}
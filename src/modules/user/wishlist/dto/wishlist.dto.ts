import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class WishlistDto {
  @ApiProperty()
  @IsNotEmpty()
  courseId: string;

  userId: string;

  createdAt?: Date;

}
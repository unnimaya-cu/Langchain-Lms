import { IsArray, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsMongoId()
  courseId: string;

  @IsNotEmpty()
  @IsMongoId()
  categoryId: string;

  @IsArray()
  @IsMongoId({ each: true })
  studentIds: string[];
}
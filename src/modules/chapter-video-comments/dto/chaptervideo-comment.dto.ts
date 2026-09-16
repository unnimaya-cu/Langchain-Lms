import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VideoCommentDto {
  @IsNotEmpty()
  @IsString()
  videoId: string;

  // @IsNotEmpty()
  // @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  comment: string;

  @IsString()
  @IsOptional()
  reply: string;
  
  @IsString()
  @IsOptional()
  previousState: string;

  repliedOn?: Date;
}

export class ReplyCommentDto{
  @IsNotEmpty()
  @IsString()
  parentId: string

  @IsNotEmpty()
  @IsString()
  videoId: string;

  @IsNotEmpty()
  @IsString()
  comment: string;
}

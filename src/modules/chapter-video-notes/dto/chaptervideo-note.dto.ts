import { IsNotEmpty, IsString } from "class-validator";

export class VideoNoteDto {
  @IsNotEmpty()
  @IsString()
  videoId: string;

  // @IsNotEmpty()
  // @IsString()
  userId: string;

  @IsNotEmpty()
  //  @Number()
  timeDuration: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  createdAt?: Date;
  updatedAt?: Date;
}
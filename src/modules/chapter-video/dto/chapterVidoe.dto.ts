import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChapterVidoeDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  videocontent?: string;

  @ApiProperty()
  @IsOptional()
  materials?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  duration: string;

  @IsString()
  videoUrl: string;

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

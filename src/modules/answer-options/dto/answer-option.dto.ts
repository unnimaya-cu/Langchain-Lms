import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  IsBoolean
} from 'class-validator';
import { Types } from 'mongoose';

export class AnswerOptionDto {
  @IsNotEmpty()
  @IsString()
  optionName: string;

  @IsNotEmpty()
  @IsBoolean()
  correctAnswer:boolean

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

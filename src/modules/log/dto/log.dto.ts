import { Transform } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class GetActivityLogDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  page: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  perPage: number;

  @IsOptional()
  @IsString()
  search: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  user_id: number;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  start_date: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  end_date: Date;
}
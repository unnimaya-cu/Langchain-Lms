import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { StatusType } from 'src/common/enum/status-type.enum';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(StatusType)
  @IsOptional()
  status?: StatusType;
  updatedBy: any;
  updatedAt: Date;
  createdBy: any;
  createdAt: Date;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  // @IsMongoId()
  // @IsNotEmpty()
  @IsOptional()
  id: string;
}

export class ListCategoryDto {
  @IsEnum(StatusType)
  @IsOptional()
  status?: StatusType;
}

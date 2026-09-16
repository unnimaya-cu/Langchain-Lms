import { Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { StatusType } from 'src/common/enum/status-type.enum';

export class UserDto {
  // userCode: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  // @IsOptional()
  // @IsString()
  // resetToken?: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  roleId: string;

  // @IsEnum(StatusType)
  // @IsOptional()
  // status?: StatusType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  joinedDate?: Date;

  // @IsOptional()
  // @Type(() => Date)
  // @IsDate()
  // lastLogin?: Date;

  @IsOptional()
  // @IsMobilePhone()
  mobile?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  profileImg?: string;

  createdAt?: Date;

  updatedAt?: Date;

  createdBy?: string;

  updatedBy?: string;
}

export class UpdateUserDto {
  userCode: string;

  @IsOptional()
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName: string;

  // @IsOptional()
  // @IsString()
  // password?: string;

  @IsOptional()
  @IsString()
  resetToken?: string;

  @IsString()
  @IsOptional()
  roleId: string;

  @IsEnum(StatusType)
  @IsOptional()
  status?: StatusType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  joinedDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastLogin?: Date;

  @IsOptional()
  // @IsMobilePhone()
  mobile?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  profileImg?: string;

  // createdAt?: Date;

  updatedAt?: Date;

  // createdBy?: string;

  updatedBy?: string;
}

export class UpdatePasswordDto{

  @IsNotEmpty()
  @IsString()
  currentPassword: string

  @IsNotEmpty()
  @IsString()
  newPassword: string
}

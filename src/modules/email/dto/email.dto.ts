import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class MailDto{
  @IsString()
  to?:string 

  @IsString()
  @IsOptional()
  cc?:string

  @IsString()
  subject?: string;

  @IsString()
  body?: string;

  @IsString()
  needToRenameFormat?: string;

  @IsOptional()
  @IsString()
  format?: string;

  attachments?: any;
}
export class EmailDto {
  @IsNotEmpty()
  to?: string;
}
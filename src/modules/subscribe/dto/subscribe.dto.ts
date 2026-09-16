import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateSubscribeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

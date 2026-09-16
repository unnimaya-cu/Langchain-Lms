import { Body, Controller, Post } from '@nestjs/common';
import { MailDto } from './dto/email.dto';
import { responseBuilder } from 'src/utils/customErrorBuilder';
import { sendMail } from 'src/utils/sendMail';

@Controller('email')
export class EmailController {
  @Post('')
  async sendMails(@Body() dto: MailDto) {
    const mailsTo = dto.to.split(',');
    const mailCC = dto.cc.split(',');
    const data = await sendMail(
      mailsTo,
      mailCC,
      dto.body,
      dto.subject,
    );
    return responseBuilder(true,data);
  }
}

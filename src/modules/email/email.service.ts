import { Injectable } from '@nestjs/common';
import { MailDto } from './dto/email.dto';
import { mailService } from 'src/utils/sendMail';
import { errorCodeBuilder, responseBuilder } from 'src/utils/customErrorBuilder';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  // async createOtpEmail(
  //   from?: string,
  //   to?: string,
  //   cc?: Array<string>,
  //   body?: string,
  //   subject?: string,
  // ) {
  //   try {
  //     const successMail = await mailService.sendMail({
  //       to: to,
  //       cc: cc,
  //       from: from ? from : 'no-reply@avaibe.com',
  //       subject: subject,
  //       html: body,
  //     });
  //     return responseBuilder(true,successMail)
  //   } catch(err) {
  //       return errorCodeBuilder(err);
  //   }
  // }
  static async sendOtpEmail(to: string, otp: string) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to,
      from: 'sreelekshmi@avaibe.com', // must be verified in SendGrid
      subject: 'Your OTP Code',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    };

    try {
      await sgMail.send(msg);
      console.log(`OTP sent to ${to}`);
    } catch (error) {
      console.error('Error sending OTP email:', error.response?.body || error.message);
      throw error;
    }
  }

  static async sendReminder(to: string, title: string) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to,
      from: 'sreelekshmi@avaibe.com', // must be verified in SendGrid
      subject: 'Assessment - Reminder',
      text: `Reminder: Your assessment ${title} is due. Please complete it before the due date.`,
      html: `<p>Reminder: Your assessment ${title} is due</strong>. Please complete it before the due date.`,
    };

    try {
      await sgMail.send(msg);
      console.log(`Reminder email sent to ${to}`);
    } catch (error) {
      console.error('Error sending reminder email:', error.response?.body || error.message);
      throw error;
    }
  }
}

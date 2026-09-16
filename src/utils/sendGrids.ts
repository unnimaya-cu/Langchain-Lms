import * as sgMail from '@sendgrid/mail';
import 'dotenv/config';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export class SendGrids {
  static async sendOtpEmail(to: string, otp: string) {
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
}

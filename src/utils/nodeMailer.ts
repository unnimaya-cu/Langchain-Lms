import * as dotenv from 'dotenv';
dotenv.config();
// import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

// import * as nodemailer from 'nodemailer';

// export const createOtpEmail = async (email: string, otp: string) => {
//   try {
//     console.log('nodemailer module:', nodemailer);

//     const transporter = nodemailer.createTransport({
//       service: process.env.EMAIL_SERVICE,
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: ` OTP for new password update`,
//       html: `
//         <p>Enter this OTP to update your password for ${email}</p>
//         <p>Your otp is - ${otp} </p>
//         <p>From: no-reply@avaibe.com</p>
//         <p>Feel free to contact us!!</p>
//       `,
//     };

//     await transporter.sendMail(mailOptions);
//     console.log(`OTP email sent successfully to: ${email}`);
//   } catch (error: any) {
//     console.error('Error sending dynamic HTML email:', error.message, error);
//   }
// };
// const config = new ConfigService();
// config.get("MAIL_SERVER")


sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export const createOtpEmail = async (email: string, otp: string) => {
  try {
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@avaibe.com',
      subject: `OTP for new password update`,
      html: `
        <p>Enter this OTP to update your password for ${email}</p>
        <p><strong>Your OTP is - ${otp}</strong></p>
        <p>From: no-reply@avaibe.com</p>
        <p>Feel free to contact us!!</p>
      `,
    };

    await sgMail.send(msg);
    console.log(`✅ OTP email sent successfully to: ${email}`);
  } catch (error: any) {
    console.error(
      ' Error sending OTP email:',
      error.response?.body || error.message || error
    );
  }
};

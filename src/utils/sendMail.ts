import { MailerOptions, MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { MailerTransportFactory } from "@nestjs-modules/mailer/dist/mailer-transport.factory";
import { errorCodeBuilder } from "./customErrorBuilder";
import * as fs from "fs";
import { Injectable } from "@nestjs/common";
import * as sgMail from '@sendgrid/mail';

const config = new ConfigService();

const mailerOptions: MailerOptions = {
  transport: {
    host: config.get("MAIL_SERVER"),
    port: config.get("MAIL_PORT"),
    secure: config.get("MAIL_SECURE"),
    auth: {
      user: config.get("MAIL_USERNAME"),
      pass: config.get("MAIL_PASSWORD"),
    },
  },
  defaults: {
    from: '"nest-modules" <modules@nestjs.com>',
  },
};

const transportFactory = new MailerTransportFactory(mailerOptions);

export const mailService = new MailerService(mailerOptions, transportFactory);

export const sendMail = async (
  to?: Array<string>,
  cc?: Array<string>,
  body?: string,
  subject?: string,
) => {
  try {
    const success = await mailService.sendMail({
      to,
      cc,
      from: "no-reply@avaibe.com",
      subject,
      html: body,
     
    });
    return success;
  } catch (err) {
    return errorCodeBuilder(err);
  }
};

// sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

// export const sendMail = async (
//   to?: Array<string> | string,
//   cc?: Array<string> | string,
//   body?: string,
//   subject?: string,
// ) => {
//   try {
//     const msg = {
//       to,
//       cc,
//       from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@avaibe.com',
//       subject,
//       html: body,
//     };

//     const success = await sgMail.send(msg);
//     return success;
//   } catch (err: any) {
//     console.error(' Error sending email:', err.response?.body || err.message);
//     throw err;
//   }
// };











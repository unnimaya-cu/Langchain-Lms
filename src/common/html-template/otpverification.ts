export const otpVerificationTemplate = (
  otp: string,
  companyName: string,
  companyAddress: string,
) => {
  const template = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f7f7f7;
        margin: 0;
        padding: 0;
      }
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        padding: 20px;
        border: 1px solid #e0e0e0;
        border-radius: 5px;
      }
      .email-header {
        text-align: center;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
      }
      .email-body {
        padding: 20px;
        text-align: center;
      }
      .email-footer {
        text-align: center;
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        font-size: 12px;
        color: #888888;
      }
      .otp-code {
        display: inline-block;
        font-size: 20px;
        font-weight: bold;
        color: #333333;
        background-color: #f0f0f0;
        padding: 10px 20px;
        margin: 20px 0;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>OTP Verification</h1>
      </div>
      <div class="email-body">
        <p>Hello,</p>
        <p>We received a request to verify your email. Please use the OTP below to complete your verification:</p>
        <div class="otp-code">${otp}</div>
        <p>If you did not request this verification, please ignore this email.</p>
        <p>Thank you,</p>
        <p>${companyName}</p>
      </div>
      <div class="email-footer">
        <p>&copy; 2024 ${companyName ?? ''}. All rights reserved.</p>
        <p>${companyAddress ?? ''}</p>
      </div>
    </div>
  </body>
  </html>
  `;
  return template;
};

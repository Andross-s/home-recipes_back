import nodemailer from "nodemailer";
import { IUser } from "../models/user";

// Nodemailer + plain SMTP was chosen over Resend/SendGrid: their free tiers only
// deliver to the account owner's own verified address until a sending domain is
// verified, which makes them unusable for testing registration with arbitrary
// emails. Any SMTP provider (Gmail app password, Mailtrap, Brevo, ...) works here
// without extra setup.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: Number(process.env.SMTP_PORT ?? 587) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendVerificationEmail = async (user: IUser, token: string): Promise<void> => {
  const verificationLink = `${process.env.APP_URL}/verify-email/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Confirm your Home Recipes account",
    html: `
      <p>Hi ${user.name},</p>
      <p>Please confirm your email address by clicking the link below:</p>
      <p><a href="${verificationLink}">${verificationLink}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

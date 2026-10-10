import "server-only";
import nodemailer from "nodemailer";
import { APP_NAME } from "@/lib/site";

// Sign-in links are sent by email through the SMTP server configured in SMTP_URL (e.g. smtps://user:pass@host:465)
// with sender SMTP_FROM. Without SMTP in local development, the link is shown on screen instead (dev only).
export const mailConfigured = () => !!process.env.SMTP_URL && !!process.env.SMTP_FROM;

export async function sendSignInLink(email: string, link: string) {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("Email sign-in is not set up on this server yet.");
    console.log(`[dev] sign-in link for ${email}: ${link}`);
    return { devLink: link };
  }
  const transport = nodemailer.createTransport(process.env.SMTP_URL!);
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Your ${APP_NAME} sign-in link`,
    text: `Click to sign in to ${APP_NAME} (valid for 30 minutes, single use):\n\n${link}\n\nIf you didn't ask for this, ignore this email.`,
  });
  return {};
}

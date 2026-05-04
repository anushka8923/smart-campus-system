import { env } from '../config/env.js';

export async function sendEmail({ to, subject, text }) {
  if (!to) return { skipped: true, reason: 'missing_recipient' };

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    if (env.NODE_ENV !== 'production') {
      console.log(`[email skipped: smtp_not_configured] ${subject} -> ${to}: ${text}`);
    }
    return { skipped: true, reason: 'smtp_not_configured' };
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    await transporter.verify();
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text });
    return { sent: true };
  } catch (error) {
    if (env.NODE_ENV !== 'production') {
      console.warn(`Email delivery failed: ${error.message}`);
      return { skipped: true, reason: error.message };
    }
    throw error;
  }
}

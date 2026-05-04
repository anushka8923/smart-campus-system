import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 5000),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REDIS_URL: process.env.REDIS_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM || 'Smart Campus <no-reply@campus.local>',
  REMINDER_HOURS_BEFORE: Number(process.env.REMINDER_HOURS_BEFORE || 24),
  SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME || 'College Super Admin',
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || 'superadmin@college.com',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || 'Super@123'
};

if (!env.MONGODB_URI) {
  console.warn('MONGODB_URI is not set.');
}

if (!env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set.');
}

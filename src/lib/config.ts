import path from 'node:path';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');

export const config = {
  port: parseInt(env.PORT || process.env.PORT || '4000', 10),
  host: env.HOST || process.env.HOST || '0.0.0.0',
  dataDir: env.DATA_DIR || process.env.DATA_DIR || './data',
  uploadDir: env.UPLOAD_DIR || process.env.UPLOAD_DIR || './data/uploads',
  maxFileSizeMb: parseInt(env.MAX_FILE_SIZE_MB || process.env.MAX_FILE_SIZE_MB || '10', 10),
  maxFiles: parseInt(env.MAX_FILES || process.env.MAX_FILES || '15', 10),
  smtp: {
    host: env.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(env.SMTP_PORT || process.env.SMTP_PORT || '587', 10),
    secure: (env.SMTP_SECURE || process.env.SMTP_SECURE) === 'true',
    user: env.SMTP_USER || process.env.SMTP_USER || '',
    pass: env.SMTP_PASS || process.env.SMTP_PASS || '',
    from: env.SMTP_FROM || process.env.SMTP_FROM || '',
  },
  notifyEmail: env.NOTIFY_EMAIL || process.env.NOTIFY_EMAIL || env.SMTP_USER || process.env.SMTP_USER || '',
  assessorName: env.ASSESSOR_NAME || process.env.ASSESSOR_NAME || 'David Redrup',
  adminPassword: (env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'changeme').trim(),
  sessionSecret: env.SESSION_SECRET || process.env.SESSION_SECRET || 'supplier-form-dev-secret',
};

export const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export function resolveUploadDir(): string {
  return path.resolve(config.uploadDir);
}

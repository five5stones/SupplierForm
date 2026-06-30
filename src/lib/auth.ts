import { randomBytes, timingSafeEqual } from 'node:crypto';
import { loadAppConfig, saveAppConfig, getAdminPassword } from './app-config';

const COOKIE_NAME = 'admin_session';
const SESSION_HOURS = 12;

export function createSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function getSessionCookie(token: string, maxAgeSeconds: number): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function getClearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function comparePassword(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const appConfig = await loadAppConfig();
  const expected = getAdminPassword(appConfig);
  if (!expected) return false;
  return comparePassword(password, expected);
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (!(await verifyAdminPassword(currentPassword))) {
    throw new Error('Current password is incorrect.');
  }

  const trimmed = newPassword.trim();
  if (trimmed.length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }

  const appConfig = await loadAppConfig();
  appConfig.settings.adminPassword = trimmed;
  await saveAppConfig(appConfig);
}

const activeSessions = new Map<string, number>();

export function registerSession(token: string): void {
  activeSessions.set(token, Date.now() + SESSION_HOURS * 60 * 60 * 1000);
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  const expires = activeSessions.get(token);
  if (!expires) return false;
  if (Date.now() > expires) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

export function revokeSession(token: string | undefined): void {
  if (token) activeSessions.delete(token);
}

export function getCookieToken(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return match?.split('=')[1];
}

export function isAdminApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/admin/');
}

export function isAdminPagePath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export function isPublicAdminPath(pathname: string): boolean {
  return pathname === '/admin/login' || pathname === '/api/admin/login';
}

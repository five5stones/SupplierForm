import fs from 'node:fs/promises';
import type { AppConfig } from './types';
import { findLogoFile, getLogoPublicPath, readUploadedLogoBuffer } from './branding';

const LOGO_URL_PATTERN = /^https?:\/\//i;
const EMAIL_LOGO_CID = 'company-logo';

export function normalizeLogoUrl(value: string | undefined): string {
  return value?.trim() || '';
}

export function isValidLogoUrl(value: string): boolean {
  const trimmed = normalizeLogoUrl(value);
  if (!trimmed || !LOGO_URL_PATTERN.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function hasUploadedLogo(appConfig: AppConfig): boolean {
  return Boolean(appConfig.settings.logoFile?.trim());
}

export function isUploadedLogoUrl(logoUrl: string): boolean {
  return logoUrl.startsWith('/api/branding/logo');
}

function logoCacheVersion(appConfig: AppConfig): string {
  return String(appConfig.settings.logoUpdatedAt || '');
}

export function getLogoDisplayUrl(appConfig: AppConfig): string {
  if (hasUploadedLogo(appConfig)) {
    const version = logoCacheVersion(appConfig);
    return version ? `${getLogoPublicPath()}?v=${version}` : getLogoPublicPath();
  }
  return normalizeLogoUrl(appConfig.settings.logoUrl);
}

export async function syncLogoFileState(appConfig: AppConfig): Promise<AppConfig> {
  const onDisk = await findLogoFile();
  const settings = { ...appConfig.settings };

  if (onDisk && settings.logoFile) {
    const stat = await fs.stat(onDisk.filePath);
    settings.logoUpdatedAt = Math.floor(stat.mtimeMs);
    return { ...appConfig, settings };
  }

  if (settings.logoFile && !onDisk) {
    settings.logoFile = '';
    settings.logoUpdatedAt = undefined;
    return { ...appConfig, settings };
  }

  return appConfig;
}

export async function fetchLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  if (!isValidLogoUrl(logoUrl)) return null;

  try {
    const response = await fetch(logoUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'image/*' },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.startsWith('image/')) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength) return null;

    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function loadLogoBuffer(
  appConfig: AppConfig,
): Promise<{ buffer: Buffer; mimeType: string; source: 'upload' | 'url' } | null> {
  const uploaded = await readUploadedLogoBuffer();
  if (uploaded) {
    return {
      buffer: uploaded.buffer,
      mimeType: uploaded.mimeType,
      source: 'upload',
    };
  }

  const logoUrl = normalizeLogoUrl(appConfig.settings.logoUrl);
  const buffer = await fetchLogoBuffer(logoUrl);
  if (!buffer) return null;

  return {
    buffer,
    mimeType: 'image/png',
    source: 'url',
  };
}

export function buildEmailLogoHtml(
  logoSrc: string,
  brandName: string,
  escapeHtml: (value: string) => string,
): string {
  if (!logoSrc) return '';
  if (!logoSrc.startsWith('cid:') && !isValidLogoUrl(logoSrc)) return '';

  return `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(brandName)}" width="180" style="display:block;max-height:48px;max-width:180px;width:auto;height:auto;margin-bottom:12px;border:0;" />`;
}

export function getEmailLogoCid(): string {
  return EMAIL_LOGO_CID;
}

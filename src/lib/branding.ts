import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const logoImageExtensions = ['.png', '.jpg', '.jpeg', '.webp'] as const;

export const logoImageMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

const LOGO_BASENAME = 'logo';

function getExtension(name: string): string {
  return path.extname(name).toLowerCase();
}

function mimeForExtension(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

export function resolveBrandingDir(): string {
  return path.resolve(config.dataDir, 'branding');
}

export function getLogoPublicPath(): string {
  return '/api/branding/logo';
}

export async function findLogoFile(): Promise<{ filename: string; filePath: string; mimeType: string } | null> {
  const brandingDir = resolveBrandingDir();

  try {
    const entries = await fs.readdir(brandingDir);
    const match = entries.find(
      (name) => name.startsWith(`${LOGO_BASENAME}.`) && logoImageExtensions.includes(getExtension(name) as typeof logoImageExtensions[number]),
    );
    if (!match) return null;

    const filePath = path.join(brandingDir, match);
    return {
      filename: match,
      filePath,
      mimeType: mimeForExtension(getExtension(match)),
    };
  } catch {
    return null;
  }
}

export async function readUploadedLogoBuffer(): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  const logo = await findLogoFile();
  if (!logo) return null;

  try {
    const buffer = await fs.readFile(logo.filePath);
    if (!buffer.length) return null;
    return { buffer, mimeType: logo.mimeType, filename: logo.filename };
  } catch {
    return null;
  }
}

export async function saveUploadedLogo(file: File): Promise<{ filename: string; mimeType: string }> {
  const ext = getExtension(file.name);
  if (!logoImageExtensions.includes(ext as typeof logoImageExtensions[number])) {
    throw new Error('Logo must be PNG, JPG, or WebP.');
  }

  if (file.size > LOGO_MAX_BYTES) {
    throw new Error(`Logo too large (max ${LOGO_MAX_BYTES / (1024 * 1024)}MB).`);
  }

  if (file.type && !logoImageMimeTypes.includes(file.type as typeof logoImageMimeTypes[number])) {
    throw new Error('Invalid logo file type.');
  }

  const brandingDir = resolveBrandingDir();
  await fs.mkdir(brandingDir, { recursive: true });
  await removeUploadedLogo();

  const filename = `${LOGO_BASENAME}${ext}`;
  const filePath = path.join(brandingDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    filename,
    mimeType: file.type || mimeForExtension(ext),
  };
}

export async function removeUploadedLogo(): Promise<void> {
  const brandingDir = resolveBrandingDir();

  try {
    const entries = await fs.readdir(brandingDir);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(`${LOGO_BASENAME}.`))
        .map((name) => fs.unlink(path.join(brandingDir, name))),
    );
  } catch {
    // No branding directory yet.
  }
}

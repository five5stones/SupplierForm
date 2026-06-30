import fs from 'node:fs/promises';
import type { APIRoute } from 'astro';
import { findLogoFile } from '../../../lib/branding';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const logo = await findLogoFile();
  if (!logo) {
    return new Response('Logo not found', { status: 404 });
  }

  const stat = await fs.stat(logo.filePath);
  const etag = `"logo-${stat.mtimeMs}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304 });
  }

  const buffer = await fs.readFile(logo.filePath);

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': logo.mimeType,
      'Cache-Control': 'public, max-age=0, must-revalidate',
      ETag: etag,
    },
  });
};

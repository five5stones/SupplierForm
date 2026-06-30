import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAttachmentFiles, loadSubmissionContext } from '../../../../../../lib/submission-downloads';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  const filename = params.filename;
  if (!id || !filename) {
    return new Response('Missing submission id or filename', { status: 400 });
  }

  const ctx = await loadSubmissionContext(id);
  if (!ctx) {
    return new Response('Submission not found', { status: 404 });
  }

  const attachment = getAttachmentFiles(ctx).find((file) => file.savedName === filename);
  if (!attachment) {
    return new Response('Attachment not found', { status: 404 });
  }

  const filePath = path.join(ctx.submissionDir, attachment.savedName);

  try {
    const content = await fs.readFile(filePath);
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.originalName.replace(/"/g, '')}"`,
      },
    });
  } catch {
    return new Response('Attachment file not found on disk', { status: 404 });
  }
};

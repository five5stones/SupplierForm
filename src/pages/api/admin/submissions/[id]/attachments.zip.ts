import type { APIRoute } from 'astro';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { Readable } from 'node:stream';
import { ZipArchive } from 'archiver';
import { getAttachmentFiles, loadSubmissionContext } from '../../../../../lib/submission-downloads';
import { getCompanyName } from '../../../../../lib/form-utils';
import type { FormAnswers } from '../../../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response('Missing submission id', { status: 400 });
  }

  const ctx = await loadSubmissionContext(id);
  if (!ctx) {
    return new Response('Submission not found', { status: 404 });
  }

  const attachments = getAttachmentFiles(ctx);
  if (!attachments.length) {
    return new Response('No attachments for this submission', { status: 404 });
  }

  const companyName = getCompanyName(ctx.answers as FormAnswers).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40) || 'supplier';
  const zipName = `${companyName}-attachments.zip`;

  const passThrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 9 } });

  archive.on('error', (error) => {
    passThrough.destroy(error);
  });

  archive.pipe(passThrough);

  for (const file of attachments) {
    const filePath = path.join(ctx.submissionDir, file.savedName);
    archive.file(filePath, { name: file.originalName });
  }

  void archive.finalize();

  return new Response(Readable.toWeb(passThrough) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
    },
  });
};

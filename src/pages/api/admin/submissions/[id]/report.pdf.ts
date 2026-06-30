import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import { ensureAssessmentPdf, loadSubmissionContext } from '../../../../../lib/submission-downloads';

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

  try {
    const { filename, filePath } = await ensureAssessmentPdf(ctx);
    const pdf = await fs.readFile(filePath);
    return new Response(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Assessment PDF error:', error);
    return new Response('Failed to generate assessment PDF', { status: 500 });
  }
};

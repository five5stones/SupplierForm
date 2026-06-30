import type { APIRoute } from 'astro';
import { getSubmission } from '../../../../lib/storage';
import type { SavedFile } from '../../../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing submission id' }), { status: 400 });
  }

  const metadata = await getSubmission(id);
  if (!metadata) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });
  }

  const attachments = Array.isArray(metadata.files) ? (metadata.files as SavedFile[]) : [];

  return new Response(JSON.stringify({ id, metadata, attachments }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

import type { APIRoute } from 'astro';
import { listSubmissions } from '../../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async () => {
  const submissions = await listSubmissions();

  const summaries = submissions.map(({ id, metadata }) => {
    const answers = (metadata.answers || metadata) as Record<string, unknown>;
    const assessment = metadata.assessment as Record<string, unknown> | undefined;

    return {
      id,
      submittedAt: metadata.submittedAt,
      companyName: answers.companyName || 'Unknown',
      contactName: answers.contactName || answers.declarationName || '—',
      email: answers.email || '—',
      percentage: assessment?.percentage,
      rating: assessment?.rating,
      approvalStatus: assessment?.approvalStatus,
    };
  });

  return new Response(JSON.stringify(summaries), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

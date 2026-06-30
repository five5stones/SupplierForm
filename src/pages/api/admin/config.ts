import type { APIRoute } from 'astro';
import { loadAppConfig, saveAppConfig } from '../../../lib/app-config';
import type { AppConfig } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async () => {
  const config = await loadAppConfig();
  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as AppConfig;
    if (!body.sections || !body.scoringCategories || !body.settings) {
      return new Response(JSON.stringify({ error: 'Invalid configuration payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!body.supplierReviewSchedules?.length) {
      body.supplierReviewSchedules = [];
    }

    await saveAppConfig(body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save configuration';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

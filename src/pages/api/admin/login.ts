import type { APIRoute } from 'astro';
import {
  createSessionToken,
  getClearSessionCookie,
  getSessionCookie,
  registerSession,
  verifyAdminPassword,
} from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const password = String(body.password || '');

  if (!(await verifyAdminPassword(password))) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = createSessionToken();
  registerSession(token);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': getSessionCookie(token, 12 * 60 * 60),
    },
  });
};

export const DELETE: APIRoute = async ({ cookies }) => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': getClearSessionCookie(),
    },
  });
};

import type { APIRoute } from 'astro';
import { getClearSessionCookie, getCookieToken, revokeSession } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = getCookieToken(request.headers.get('cookie'));
  revokeSession(token);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': getClearSessionCookie(),
    },
  });
};

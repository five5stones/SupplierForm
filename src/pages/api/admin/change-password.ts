import type { APIRoute } from 'astro';
import { changeAdminPassword } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'All password fields are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (newPassword !== confirmPassword) {
      return new Response(JSON.stringify({ error: 'New passwords do not match.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await changeAdminPassword(currentPassword, newPassword);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change password';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

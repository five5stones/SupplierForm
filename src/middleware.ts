import { defineMiddleware } from 'astro:middleware';
import {
  getCookieToken,
  isAdminApiPath,
  isAdminPagePath,
  isPublicAdminPath,
  verifySession,
} from './lib/auth';

function isPublicAdminPathExtended(pathname: string): boolean {
  return isPublicAdminPath(pathname) || pathname === '/api/admin/logout';
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!isAdminPagePath(pathname) && !isAdminApiPath(pathname)) {
    return next();
  }

  if (isPublicAdminPathExtended(pathname)) {
    return next();
  }

  const token = getCookieToken(context.request.headers.get('cookie'));
  if (!verifySession(token)) {
    if (isAdminApiPath(pathname)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    return context.redirect('/admin/login');
  }

  return next();
});

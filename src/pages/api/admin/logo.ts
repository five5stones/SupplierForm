import type { APIRoute } from 'astro';
import { loadAppConfig, saveAppConfig } from '../../../lib/app-config';
import { getLogoPublicPath, removeUploadedLogo, saveUploadedLogo } from '../../../lib/branding';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('logo');

    if (!(file instanceof File) || file.size === 0) {
      return new Response(JSON.stringify({ error: 'Choose a logo file to upload.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const saved = await saveUploadedLogo(file);
    const appConfig = await loadAppConfig();
    appConfig.settings.logoFile = saved.filename;
    appConfig.settings.logoUrl = '';
    appConfig.settings.logoUpdatedAt = Date.now();
    await saveAppConfig(appConfig);

    return new Response(
      JSON.stringify({
        ok: true,
        logoFile: saved.filename,
        logoUrl: `${getLogoPublicPath()}?v=${appConfig.settings.logoUpdatedAt}`,
        logoUpdatedAt: appConfig.settings.logoUpdatedAt,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload logo';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async () => {
  try {
    await removeUploadedLogo();
    const appConfig = await loadAppConfig();
    appConfig.settings.logoFile = '';
    appConfig.settings.logoUpdatedAt = undefined;
    await saveAppConfig(appConfig);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove logo';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

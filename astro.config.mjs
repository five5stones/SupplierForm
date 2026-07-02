import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

function buildSecurityConfig() {
  const origin = process.env.ORIGIN?.trim();
  if (!origin) {
    // Direct access (IP:4000) or reverse proxy without ORIGIN configured.
    return { checkOrigin: false };
  }

  const url = new URL(origin);
  const pattern = {
    hostname: url.hostname,
    protocol: url.protocol.replace(':', ''),
  };

  if (url.port) {
    pattern.port = url.port;
  }

  return {
    checkOrigin: true,
    allowedDomains: [pattern],
  };
}

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    port: 4000,
    host: true,
  },
  security: buildSecurityConfig(),
});

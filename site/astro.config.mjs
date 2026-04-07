import { defineConfig } from 'astro/config';

export default defineConfig({
  site:
    process.env.PUBLIC_SITE_URL ??
    process.env.TABLETOP_NEXUS_SITE_URL ??
    'https://tabletopnexus.app',
  output: 'static',
});

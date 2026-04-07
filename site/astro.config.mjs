import { defineConfig } from 'astro/config';

const siteUrl =
  process.env.PUBLIC_SITE_URL ??
  process.env.TABLETOP_NEXUS_SITE_URL ??
  'https://digisoluk.github.io/tabletop-nexus/';
const derivedBase = new URL(siteUrl).pathname.replace(/\/?$/, '/');

export default defineConfig({
  site: siteUrl,
  base: process.env.PUBLIC_SITE_BASE ?? derivedBase,
  output: 'static',
});

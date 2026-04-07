const siteUrl =
  import.meta.env.PUBLIC_SITE_URL ?? 'https://digisoluk.github.io/tabletop-nexus/';
const githubRepoUrl =
  import.meta.env.PUBLIC_GITHUB_REPO_URL ?? 'https://github.com/DigiSolUK/tabletop-nexus';
const githubIssuesUrl =
  import.meta.env.PUBLIC_GITHUB_ISSUES_URL ?? `${githubRepoUrl}/issues`;
const githubReleasesUrl = `${githubRepoUrl}/releases`;
const supportEmail =
  import.meta.env.PUBLIC_SUPPORT_EMAIL ?? 'support@tabletopnexus.app';

export const siteConfig = {
  appName: 'TableTop Nexus',
  siteUrl,
  githubRepoUrl,
  githubIssuesUrl,
  githubReleasesUrl,
  supportEmail,
  companyName: import.meta.env.PUBLIC_COMPANY_NAME ?? 'DigiSolUK',
  legalLastUpdated: import.meta.env.PUBLIC_LEGAL_LAST_UPDATED ?? '2026-04-07',
};

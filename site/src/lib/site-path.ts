const basePath = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

export const withBasePath = (path: string) => {
  const normalized = path === '/' ? '' : path.replace(/^\/+/, '');
  if (!normalized) {
    return basePath;
  }
  return `${basePath}${normalized}`.replace(/\/{2,}/g, '/');
};

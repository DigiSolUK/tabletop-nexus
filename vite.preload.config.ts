import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: false,
    target: 'node20',
  },
});

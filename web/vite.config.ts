import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const sharedSrc = path.resolve(__dirname, '../shared/src');

export default defineConfig(({ command, mode }) => {
  // The console is served from the domain root by default. A subpath host such as GitHub Pages
  // (https://user.github.io/<repo>/console/) sets VITE_BASE_PATH so every asset URL gets that prefix.
  // Only the production build uses it: local dev (`npm run dev`) always runs at "/".
  const env = loadEnv(mode, __dirname, 'VITE_');
  const base = command === 'build' ? env.VITE_BASE_PATH || '/' : '/';

  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@saanpaw/shared': path.join(sharedSrc, 'index.ts'),
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: true,
      // The shared workspace is consumed as TypeScript source with no build step,
      // so Vite has to be allowed to serve files from outside this package root.
      fs: { allow: [path.resolve(__dirname, '..')] },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
    optimizeDeps: {
      // Same reason: let esbuild compile the shared sources rather than trying to
      // pre-bundle them as an external dependency.
      exclude: ['@saanpaw/shared'],
    },
  };
});

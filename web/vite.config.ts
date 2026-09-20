import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const sharedSrc = path.resolve(__dirname, '../shared/src');

// GitHub Pages serves a project repo from https://user.github.io/<repo>/, not
// from the domain root, so every asset URL needs that prefix - but only in the
// production build. Local dev (`npm run dev`) still runs at "/".
const GH_PAGES_BASE = '/SaanPaw-Demo-Project/console/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? GH_PAGES_BASE : '/',
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
}));

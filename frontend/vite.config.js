import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Where the FastAPI service lives during development. The browser always
  // calls the same-origin path /api and Vite forwards it, so no CORS round
  // trip is needed and the preview host works unchanged.
  const apiTarget = process.env.AIMDS_API_TARGET || 'http://localhost:8000';

  /*
   * `--mode standalone` produces one JS chunk and one stylesheet, which
   * tools/standalone.mjs then inlines into a single portable HTML file.
   * Code splitting and blob-URL module loading are both avoided so the
   * result runs from the filesystem and inside sandboxed preview frames.
   */
  const standalone = mode === 'standalone';

  return {
    plugins: [react()],
    build: standalone
      ? {
          outDir: 'dist/standalone',
          emptyOutDir: true,
          cssCodeSplit: false,
          assetsInlineLimit: 1024 * 1024,
          chunkSizeWarningLimit: 4000,
          rolldownOptions: {
            output: { codeSplitting: false },
          },
        }
      : {
          // Keep the heavy third-party libraries in their own long-lived
          // chunks so app changes do not invalidate them in the browser cache.
          rolldownOptions: {
            output: {
              advancedChunks: {
                groups: [
                  { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-|decimal\.js)/ },
                  { name: 'motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)/ },
                  {
                    name: 'react-vendor',
                    test: /node_modules[\\/](react|react-dom|react-router|scheduler)/,
                  },
                ],
              },
            },
          },
        },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: false,
      allowedHosts: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },
  };
});

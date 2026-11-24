import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { scrapeProductUrl, proxyProductImage } from './src/server/metadataScraper';
import type { IncomingMessage, ServerResponse } from 'http';

function scraperPlugin(): Plugin {
  const scraperMiddleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) => {
    if (req.url && req.url.startsWith('/api/scrape-product')) {
      try {
        const urlObj = new URL(req.url, 'http://localhost:5173');
        const proxyImage = urlObj.searchParams.get('proxyImage');

        if (req.method === 'GET' && proxyImage) {
          const proxied = await proxyProductImage(proxyImage);
          if (proxied.ok && proxied.buffer && proxied.contentType) {
            res.statusCode = 200;
            res.setHeader('Content-Type', proxied.contentType);
            res.setHeader(
              'Cache-Control',
              'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
            );
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.end(proxied.buffer);
            return;
          }
          res.statusCode = proxied.status || 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: proxied.error || 'Ошибка прокси' }));
          return;
        }

        res.setHeader('Content-Type', 'application/json');
        let targetUrl = urlObj.searchParams.get('url');

        if (!targetUrl && req.method === 'POST') {
          const buffers: any[] = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const bodyStr = Buffer.concat(buffers).toString();
          const json = JSON.parse(bodyStr || '{}');
          targetUrl = json.url;
        }

        if (!targetUrl) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'Параметр url обязателен' }));
          return;
        }

        const result = await scrapeProductUrl(targetUrl);
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (e: any) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            success: false,
            error: e.message || 'Ошибка обработки запроса',
          })
        );
      }
      return;
    }
    next();
  };

  return {
    name: 'lovia-metadata-scraper-plugin',
    configureServer(server) {
      server.middlewares.use(scraperMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(scraperMiddleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), scraperPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase/')) {
              return 'vendor-supabase';
            }
            if (
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('/react-dom/') ||
              id.includes('\\react-dom\\') ||
              id.includes('/react-router') ||
              id.includes('\\react-router') ||
              id.includes('/scheduler/') ||
              id.includes('\\scheduler\\')
            ) {
              return 'vendor-react';
            }
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/supabase-proxy': {
        target: 'https://uwbdtisxjzmnzkodiexo.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-proxy/, ''),
      },
    },
  },
});

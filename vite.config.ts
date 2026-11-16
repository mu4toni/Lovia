import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { scrapeProductUrl } from './src/server/metadataScraper';
import type { IncomingMessage, ServerResponse } from 'http';

function scraperPlugin(): Plugin {
  const scraperMiddleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void
  ) => {
    if (req.url && req.url.startsWith('/api/scrape-product')) {
      res.setHeader('Content-Type', 'application/json');
      try {
        const urlObj = new URL(req.url, 'http://localhost:5173');
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

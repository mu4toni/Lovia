import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scrapeProductUrl } from '../src/server/metadataScraper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let targetUrl: string | undefined;

  if (req.method === 'GET') {
    targetUrl = typeof req.query.url === 'string' ? req.query.url : undefined;
  } else if (req.method === 'POST') {
    targetUrl = req.body?.url;
  }

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Параметр url обязателен',
    });
  }

  try {
    const result = await scrapeProductUrl(targetUrl);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error?.message || 'Ошибка обработки ссылки товара',
    });
  }
}

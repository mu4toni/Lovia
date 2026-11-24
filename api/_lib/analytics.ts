const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';
const CAPTURE_TIMEOUT_MS = 1000;

export interface AnalyticsBatchEvent {
  distinctId: string;
  event: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

function getPostHogConfig(): { apiKey: string; host: string } | null {
  const apiKey = (process.env.POSTHOG_API_KEY || '').trim();
  if (!apiKey) return null;

  const rawHost = (process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).trim();
  const host = (rawHost || DEFAULT_POSTHOG_HOST).replace(/\/+$/, '');
  return { apiKey, host };
}

async function postJsonWithTimeout(url: string, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // Never break or slow down the main serverless request on analytics failure/timeout
  } finally {
    clearTimeout(timer);
  }
}

export async function trackEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, any>
): Promise<void> {
  const config = getPostHogConfig();
  if (!config || !distinctId || !event) return;

  await postJsonWithTimeout(`${config.host}/capture/`, {
    api_key: config.apiKey,
    event,
    distinct_id: distinctId,
    properties: {
      ...(properties || {}),
      env: 'production',
    },
    timestamp: new Date().toISOString(),
  });
}

export async function trackEventsBatch(events: AnalyticsBatchEvent[]): Promise<void> {
  const config = getPostHogConfig();
  if (!config || !Array.isArray(events) || events.length === 0) return;

  const nowIso = new Date().toISOString();
  const batch = events
    .filter((item) => Boolean(item.distinctId && item.event))
    .map((item) => ({
      event: item.event,
      distinct_id: item.distinctId,
      properties: {
        ...(item.properties || {}),
        env: 'production',
      },
      timestamp: item.timestamp || nowIso,
    }));

  if (batch.length === 0) return;

  await postJsonWithTimeout(`${config.host}/batch/`, {
    api_key: config.apiKey,
    batch,
  });
}

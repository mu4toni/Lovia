import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

if (!posthogKey) {
  if (import.meta.env.DEV) {
    throw new Error(
      'VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured',
    );
  }
} else if (!posthogHost) {
  if (import.meta.env.DEV) {
    throw new Error(
      'VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured',
    );
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    defaults: '2026-08-30',
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
    logs: {
      serviceName: 'lovia-web',
      environment: import.meta.env.MODE,
    },
  });
}

type PostHogProperties = Record<string, string | number | boolean | null | undefined>;
type PostHogLogAttributes = Record<string, string | number | boolean>;

export function captureEvent(event: string, properties?: PostHogProperties): void {
  if (!posthogKey || !posthogHost) return;
  posthog.capture(event, properties);
}

export function captureException(error: Error, properties?: PostHogProperties): void {
  if (!posthogKey || !posthogHost) return;
  posthog.captureException(error, properties);
}

export const posthogLogger = {
  info(message: string, attributes?: PostHogLogAttributes): void {
    if (!posthogKey || !posthogHost) return;
    posthog.logger.info(message, attributes);
  },
};

export function identifyUser(user: { id: string; name?: string; gender?: 'male' | 'female' }): void {
  if (!posthogKey || !posthogHost || !user.id) return;

  posthog.identify(user.id, {
    ...(user.name ? { name: user.name } : {}),
    ...(user.gender ? { gender: user.gender } : {}),
  });
}

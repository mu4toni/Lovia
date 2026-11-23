import posthog from 'posthog-js';

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

if (posthogKey && posthogHost) {
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
} else if (import.meta.env.DEV) {
  const missingVariable = posthogKey ? 'VITE_POSTHOG_HOST' : 'VITE_POSTHOG_KEY';
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  );
}

export function capture(
  event: string,
  properties?: Parameters<typeof posthog.capture>[1],
) {
  try {
    posthog.capture(event, properties);
  } catch (error) {
    console.warn('[PostHog] Failed to capture event:', error);
  }
}

export const posthogLogger = {
  info(message: string, attributes?: Parameters<typeof posthog.logger.info>[1]) {
    try {
      posthog.logger.info(message, attributes);
    } catch (error) {
      console.warn('[PostHog] Failed to capture log:', error);
    }
  },
};

export default posthog;

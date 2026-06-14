import * as Sentry from '@sentry/cloudflare';
import handler from '@astrojs/cloudflare/entrypoints/server';

interface SentryWorkerEnvironment {
  SENTRY_DSN?: string;
}

export default Sentry.withSentry(
  (environment: SentryWorkerEnvironment) => ({
    dsn: environment.SENTRY_DSN,
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    enableLogs: true,
  }),
  handler,
);

import * as Sentry from '@sentry/astro';
import * as SentryCloudflare from '@sentry/cloudflare';
import handler from '@astrojs/cloudflare/entrypoints/server';

const publicSentryDsn = import.meta.env.PUBLIC_SENTRY_DSN as string | undefined;

Sentry.init({
  dsn: publicSentryDsn,
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  enableLogs: true,
});

interface SentryWorkerEnvironment {
  SENTRY_DSN?: string;
  PUBLIC_SENTRY_DSN?: string;
}

export default SentryCloudflare.withSentry(
  (environment: SentryWorkerEnvironment) => ({
    dsn: environment.SENTRY_DSN ?? environment.PUBLIC_SENTRY_DSN ?? publicSentryDsn,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    enableLogs: true,
  }),
  handler,
);

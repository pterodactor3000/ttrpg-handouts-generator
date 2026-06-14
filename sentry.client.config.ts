import * as Sentry from '@sentry/astro';

const publicSentryDsn = import.meta.env.PUBLIC_SENTRY_DSN as string | undefined;

Sentry.init({
  dsn: publicSentryDsn,
  sendDefaultPii: true,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  enableLogs: true,
});

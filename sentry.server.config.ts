import * as Sentry from '@sentry/cloudflare';
import handler from '@astrojs/cloudflare/entrypoints/server';
import { purgeScheduledAccounts } from '@/lib/purge-scheduled-accounts';

interface SentryWorkerEnvironment {
  SENTRY_DSN?: string;
}

const worker = {
  fetch: handler.fetch,
  async scheduled(): Promise<void> {
    await purgeScheduledAccounts(new Date());
  },
};

export default Sentry.withSentry(
  (environment: SentryWorkerEnvironment) => ({
    dsn: environment.SENTRY_DSN,
    sendDefaultPii: true,
    tracesSampleRate: 0.1,
    enableLogs: true,
  }),
  worker,
);

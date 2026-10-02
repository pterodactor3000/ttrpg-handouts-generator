import { describe, expect, it } from 'vitest';

import { parseRecipientList, resolveEmailConfig } from '../src/email.js';

describe('email', () => {
  it('parses comma-separated recipients', () => {
    expect(parseRecipientList('a@example.com, b@example.com')).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
  });

  it('returns null when email env is incomplete', () => {
    expect(
      resolveEmailConfig({
        RESEND_API_KEY: 're_test',
        REPORT_FROM_EMAIL: 'reports@example.com',
      }),
    ).toBeNull();
  });

  it('returns config when all email env vars are set', () => {
    expect(
      resolveEmailConfig({
        RESEND_API_KEY: 're_test',
        REPORT_FROM_EMAIL: 'reports@example.com',
        REPORT_RECIPIENT_EMAIL: 'me@example.com',
      }),
    ).toEqual({
      apiKey: 're_test',
      from: 'reports@example.com',
      recipients: ['me@example.com'],
    });
  });
});

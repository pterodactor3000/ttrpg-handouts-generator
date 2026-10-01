import { describe, expect, it } from 'vitest';
import { formatDeletionInstant } from '@/lib/format-deletion-instant';

const JUST_AFTER_MIDNIGHT_UTC = new Date('2026-01-15T00:30:00.000Z');
const LOCALE = 'en-US';

describe('formatDeletionInstant', () => {
  it('returns the previous local day in America/Los_Angeles for an instant just after midnight UTC', () => {
    const formatted = formatDeletionInstant(JUST_AFTER_MIDNIGHT_UTC, LOCALE, 'America/Los_Angeles');

    expect(formatted).toContain('January 14');
    expect(formatted).toContain('4:30');
  });

  it('returns that same UTC day when the zone is UTC', () => {
    const formatted = formatDeletionInstant(JUST_AFTER_MIDNIGHT_UTC, LOCALE, 'UTC');

    expect(formatted).toContain('January 15');
    expect(formatted).toContain('12:30');
  });
});

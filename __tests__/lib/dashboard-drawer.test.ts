import { describe, expect, it } from 'vitest';
import { getDrawerPresentation } from '@/lib/dashboard-drawer';

describe('getDrawerPresentation', () => {
  it('returns sidebar on a wide viewport and overlay on a narrow viewport', () => {
    expect(getDrawerPresentation({ isWide: true })).toBe('sidebar');
    expect(getDrawerPresentation({ isWide: false })).toBe('overlay');
  });
});

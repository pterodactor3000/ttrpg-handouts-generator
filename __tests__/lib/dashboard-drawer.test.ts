import { describe, expect, it } from 'vitest';
import { getDrawerPresentation } from '@/lib/dashboard-drawer';

describe('getDrawerPresentation', () => {
  it('returns sidebar only when pinned and wide, and overlay for the other three pairs', () => {
    expect(getDrawerPresentation({ isPinned: true, isWide: true })).toBe('sidebar');
    expect(getDrawerPresentation({ isPinned: true, isWide: false })).toBe('overlay');
    expect(getDrawerPresentation({ isPinned: false, isWide: true })).toBe('overlay');
    expect(getDrawerPresentation({ isPinned: false, isWide: false })).toBe('overlay');
  });
});

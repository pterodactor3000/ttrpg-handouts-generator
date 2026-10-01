import { describe, expect, it } from 'vitest';
import { fitTagChips } from '@/lib/fit-tag-chips';

describe('fitTagChips', () => {
  it('returns visible count 0, hidden count 0, and showOverflow false when chipWidths is empty', () => {
    expect(
      fitTagChips({
        chipWidths: [],
        gap: 8,
        containerWidth: 100,
        overflowChipWidth: 24,
      }),
    ).toEqual({ visibleCount: 0, hiddenCount: 0, showOverflow: false });
  });

  it('shows every chip and no overflow control when the chips fit', () => {
    expect(
      fitTagChips({
        chipWidths: [20, 20, 20],
        gap: 10,
        containerWidth: 80,
        overflowChipWidth: 20,
      }),
    ).toEqual({ visibleCount: 3, hiddenCount: 0, showOverflow: false });
  });

  it('reserves room for the overflow control and returns the hidden count when they do not fit', () => {
    expect(
      fitTagChips({
        chipWidths: [10, 10, 10, 10],
        gap: 0,
        containerWidth: 30,
        overflowChipWidth: 10,
      }),
    ).toEqual({ visibleCount: 2, hiddenCount: 2, showOverflow: true });
  });

  it('returns a visible count of 0 and a hidden count of every chip when the overflow control is the only thing that fits', () => {
    expect(
      fitTagChips({
        chipWidths: [50, 50],
        gap: 10,
        containerWidth: 40,
        overflowChipWidth: 30,
      }),
    ).toEqual({ visibleCount: 0, hiddenCount: 2, showOverflow: true });
  });

  it('returns a visible count of 0 when the container width is 0 and the overflow control has width', () => {
    expect(
      fitTagChips({
        chipWidths: [10],
        gap: 8,
        containerWidth: 0,
        overflowChipWidth: 24,
      }),
    ).toEqual({ visibleCount: 0, hiddenCount: 1, showOverflow: true });
  });

  it('shows the only chip and no overflow control when that chip fits', () => {
    expect(
      fitTagChips({
        chipWidths: [20],
        gap: 8,
        containerWidth: 40,
        overflowChipWidth: 16,
      }),
    ).toEqual({ visibleCount: 1, hiddenCount: 0, showOverflow: false });
  });
});

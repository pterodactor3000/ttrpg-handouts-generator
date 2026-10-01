interface FitTagChipsInput {
  chipWidths: number[];
  gap: number;
  containerWidth: number;
  overflowChipWidth: number;
}

interface FitTagChipsResult {
  visibleCount: number;
  hiddenCount: number;
  showOverflow: boolean;
}

function widthOfVisibleChips(chipWidths: number[], visibleCount: number, gap: number): number {
  if (visibleCount <= 0) {
    return 0;
  }

  let totalWidth = 0;
  for (let index = 0; index < visibleCount; index += 1) {
    totalWidth += chipWidths[index] ?? 0;
  }

  return totalWidth + gap * (visibleCount - 1);
}

function fitTagChips(input: FitTagChipsInput): FitTagChipsResult {
  const { chipWidths, gap, containerWidth, overflowChipWidth } = input;

  if (chipWidths.length === 0) {
    return { visibleCount: 0, hiddenCount: 0, showOverflow: false };
  }

  const fullRowWidth = widthOfVisibleChips(chipWidths, chipWidths.length, gap);
  if (fullRowWidth <= containerWidth) {
    return { visibleCount: chipWidths.length, hiddenCount: 0, showOverflow: false };
  }

  for (let visibleCount = chipWidths.length - 1; visibleCount >= 0; visibleCount -= 1) {
    const chipsWidth = widthOfVisibleChips(chipWidths, visibleCount, gap);
    const gapBeforeOverflow = visibleCount > 0 ? gap : 0;
    const rowWidth = chipsWidth + gapBeforeOverflow + overflowChipWidth;

    if (rowWidth <= containerWidth) {
      return {
        visibleCount,
        hiddenCount: chipWidths.length - visibleCount,
        showOverflow: true,
      };
    }
  }

  return {
    visibleCount: 0,
    hiddenCount: chipWidths.length,
    showOverflow: true,
  };
}

export type { FitTagChipsInput, FitTagChipsResult };
export { fitTagChips };

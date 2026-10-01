import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { fitTagChips, type FitTagChipsResult } from '@/lib/fit-tag-chips';

interface UseFittedTagChipsResult {
  rowRef: RefObject<HTMLDivElement | null>;
  fitted: FitTagChipsResult | null;
}

interface ResolveFittedTagsInput {
  chipWidths: number[];
  gap: number;
  containerWidth: number;
  measureOverflowWidth: (hiddenCount: number) => number;
}

function readRowGap(row: HTMLElement): number {
  const parsedGap = Number.parseFloat(getComputedStyle(row).columnGap);
  return Number.isFinite(parsedGap) ? parsedGap : 0;
}

function measureOverflowButton(row: HTMLElement, className: string, hiddenCount: number): number {
  const probe = document.createElement('button');
  probe.type = 'button';
  probe.className = className;
  probe.textContent = `+${hiddenCount}`;
  probe.tabIndex = -1;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  row.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

function resolveFittedTags(input: ResolveFittedTagsInput): FitTagChipsResult {
  const fittedWithoutOverflow = fitTagChips({
    chipWidths: input.chipWidths,
    gap: input.gap,
    containerWidth: input.containerWidth,
    overflowChipWidth: 0,
  });

  if (!fittedWithoutOverflow.showOverflow) {
    return fittedWithoutOverflow;
  }

  let visibleCount = input.chipWidths.length - 1;
  while (visibleCount >= 0) {
    const hiddenCount = input.chipWidths.length - visibleCount;
    const overflowChipWidth = input.measureOverflowWidth(hiddenCount);
    const fitted = fitTagChips({
      chipWidths: input.chipWidths,
      gap: input.gap,
      containerWidth: input.containerWidth,
      overflowChipWidth,
    });

    if (fitted.visibleCount >= visibleCount) {
      return { visibleCount, hiddenCount, showOverflow: true };
    }

    visibleCount -= 1;
  }

  return {
    visibleCount: 0,
    hiddenCount: input.chipWidths.length,
    showOverflow: true,
  };
}

function isSameFit(current: FitTagChipsResult | null, next: FitTagChipsResult): boolean {
  if (!current) {
    return false;
  }

  return (
    current.visibleCount === next.visibleCount &&
    current.hiddenCount === next.hiddenCount &&
    current.showOverflow === next.showOverflow
  );
}

function useFittedTagChips(tags: string[], overflowButtonClassName: string): UseFittedTagChipsResult {
  const rowRef = useRef<HTMLDivElement>(null);
  const chipWidthsRef = useRef<number[]>([]);
  const [fitted, setFitted] = useState<FitTagChipsResult | null>(null);
  const [measureGeneration, setMeasureGeneration] = useState(0);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) {
      return;
    }

    let isCancelled = false;

    const fitRow = () => {
      const chipNodes = row.querySelectorAll<HTMLElement>('[data-tag-chip]');
      if (chipNodes.length === tags.length) {
        chipWidthsRef.current = Array.from(chipNodes, (chip) => chip.getBoundingClientRect().width);
      }

      const chipWidths = chipWidthsRef.current;
      if (chipWidths.length !== tags.length) {
        return;
      }

      const nextFit = resolveFittedTags({
        chipWidths,
        gap: readRowGap(row),
        containerWidth: row.clientWidth,
        measureOverflowWidth: (hiddenCount) => measureOverflowButton(row, overflowButtonClassName, hiddenCount),
      });

      setFitted((current) => (isSameFit(current, nextFit) ? current : nextFit));
    };

    fitRow();
    const observer = new ResizeObserver(() => {
      fitRow();
    });
    observer.observe(row);

    const fontSet = document.fonts;
    if (fontSet.status !== 'loaded') {
      fontSet.ready
        .then(() => {
          if (isCancelled) {
            return;
          }
          chipWidthsRef.current = [];
          setFitted(null);
          setMeasureGeneration((currentGeneration) => currentGeneration + 1);
        })
        .catch((error: unknown) => {
          console.error('Failed to remeasure tag chips after document fonts loaded', error);
        });
    }

    return () => {
      isCancelled = true;
      observer.disconnect();
    };
  }, [measureGeneration, overflowButtonClassName, tags]);

  return { rowRef, fitted };
}

export type { UseFittedTagChipsResult };
export { useFittedTagChips };

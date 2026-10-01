// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFittedTagChips } from '@/components/hooks/useFittedTagChips';

const TAGS = ['quest', 'noble', 'letter'];

function TagRowProbe({ tags }: { tags: string[] }) {
  const { rowRef, fitted } = useFittedTagChips(tags, 'overflow-probe');
  const showOverflow = fitted?.showOverflow ?? false;
  const visibleTags = showOverflow ? tags.slice(0, fitted?.visibleCount ?? 0) : tags;

  return (
    <div ref={rowRef} data-tag-row="">
      {visibleTags.map((tag) => (
        <span key={tag} data-tag-chip="">
          {tag}
        </span>
      ))}
      {showOverflow ? <span>+{fitted?.hiddenCount}</span> : null}
    </div>
  );
}

function installLayoutMocks(chipWidth: () => number) {
  const clientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  const boundingRect = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'getBoundingClientRect');

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.hasAttribute('data-tag-row') ? 100 : 0;
    },
  });

  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(this: HTMLElement) {
    const width = this.hasAttribute('data-tag-chip') || this.tagName === 'BUTTON' ? chipWidth() : 0;
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 0,
      right: width,
      width,
      height: 0,
      toJSON() {
        return {};
      },
    };
  };

  return () => {
    if (clientWidth) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
    }
    if (boundingRect) {
      Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', boundingRect);
    }
  };
}

describe('useFittedTagChips', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('remeasures every chip after document fonts finish loading', async () => {
    let chipWidth = 80;
    const restoreLayout = installLayoutMocks(() => chipWidth);
    let markFontsLoaded: () => void = () => {
      return undefined;
    };
    const ready = new Promise<FontFaceSet>((resolve) => {
      markFontsLoaded = () => {
        Object.defineProperty(document.fonts, 'status', { configurable: true, value: 'loaded' });
        resolve(document.fonts);
      };
    });
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { status: 'loading', ready },
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {
          /* empty */
        }
        disconnect() {
          /* empty */
        }
      },
    );

    try {
      render(<TagRowProbe tags={TAGS} />);

      expect(screen.getByText('+3')).toBeInTheDocument();
      expect(document.querySelectorAll('[data-tag-chip]')).toHaveLength(0);

      chipWidth = 20;
      await act(async () => {
        markFontsLoaded();
        await ready;
      });

      expect(screen.queryByText('+3')).not.toBeInTheDocument();
      expect(screen.getByText('quest')).toBeInTheDocument();
      expect(screen.getByText('noble')).toBeInTheDocument();
      expect(screen.getByText('letter')).toBeInTheDocument();
    } finally {
      restoreLayout();
    }
  });
});

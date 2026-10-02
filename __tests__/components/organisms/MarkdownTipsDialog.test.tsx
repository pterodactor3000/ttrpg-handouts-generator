// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MarkdownTipsDialog } from '@/components/organisms/MarkdownTipsDialog';
import { MARKDOWN_GUIDE_EXAMPLES } from '@/lib/markdown-guide';
import type { MarkdownGuideExample } from '@/lib/markdown-guide';

const RENDERED_FRAGMENT_BY_ID: Record<MarkdownGuideExample['id'], string> = {
  heading: '<h1>',
  emphasis: '<strong>',
  'unordered-list': '<ul>',
  'ordered-list': '<ol>',
  blockquote: '<blockquote>',
  'inline-code': '<code>const</code>',
  'fenced-code': '<pre',
  table: '<table>',
  link: 'href="https://example.com"',
};

afterEach(cleanup);

function ClosedByParent() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <MarkdownTipsDialog
      open={isOpen}
      onClose={() => {
        setIsOpen(false);
      }}
    />
  );
}

describe('MarkdownTipsDialog', () => {
  it('renders nothing while closed', () => {
    render(<MarkdownTipsDialog open={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the header, each source, and each preview while open', () => {
    render(<MarkdownTipsDialog open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: /markdown tips/i });
    expect(dialog).toHaveTextContent('Syntax the handout preview already renders.');

    for (const example of MARKDOWN_GUIDE_EXAMPLES) {
      const tip = dialog.querySelector(`[data-markdown-tip="${example.id}"]`);
      expect(tip).toBeInstanceOf(HTMLElement);
      expect(tip?.querySelector('[data-markdown-source]')?.textContent).toBe(example.markdown);
      expect(tip?.querySelector('[data-markdown-preview]')?.innerHTML).toContain(RENDERED_FRAGMENT_BY_ID[example.id]);
    }
  });

  it('asks the parent to close and stays open when the parent keeps it open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MarkdownTipsDialog open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: /markdown tips/i })).toBeInTheDocument();
  });

  it('leaves the screen when the parent closes it', async () => {
    const user = userEvent.setup();
    render(<ClosedByParent />);

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the header and close control outside the scrolling example list', () => {
    render(<MarkdownTipsDialog open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: /markdown tips/i });
    expect(dialog).toHaveClass('flex', 'max-h-[calc(100dvh-2rem)]', 'overflow-hidden');
    expect(dialog.className.split(/\s+/)).not.toContain('grid');

    const scroller = dialog.querySelector('ul')?.parentElement;
    expect(scroller).toHaveClass('overflow-y-auto', 'min-h-0', 'flex-auto');
    expect(scroller).not.toContainElement(screen.getByRole('heading', { name: 'Markdown tips' }));
    expect(scroller).not.toContainElement(screen.getByRole('button', { name: /^close$/i }));
  });
});

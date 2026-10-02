// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HandoutEditor from '@/components/organisms/HandoutEditor';
import { MARKDOWN_GUIDE_EXAMPLES } from '@/lib/markdown-guide';
import type { MarkdownGuideExample } from '@/lib/markdown-guide';
import type { InitialHandout } from '@/types';

const publishedInitialHandout: InitialHandout = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Existing published handout',
  markdownContent: '# Published content',
  backgroundCategory: 'fantasy',
  tags: ['session-one'],
  status: 'published',
  shareToken: '22222222-2222-4222-8222-222222222222',
};

const draftInitialHandout: InitialHandout = {
  id: '33333333-3333-4333-8333-333333333333',
  title: 'Existing draft handout',
  markdownContent: '# Draft content',
  backgroundCategory: 'horror',
  tags: ['draft-tag'],
  status: 'draft',
  shareToken: null,
};

// Ensure a clean DOM between tests — RTL does not auto-cleanup in all vitest setups.
afterEach(cleanup);

// Prevent unhandled fetch rejections if any side effect accidentally fires.
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));

// jsdom does not perform real navigation; stub window.location so href
// assignments can be asserted without triggering an actual page load.
beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '', origin: 'http://localhost' },
  });
});

describe('HandoutEditor — back button', () => {
  it('navigates to /dashboard immediately when the form is clean', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor />);

    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));

    expect(window.location.href).toBe('/dashboard');
  });

  it('opens the discard dialog instead of navigating when the form is dirty', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor />);

    await user.type(screen.getByLabelText(/title/i), 'My handout');
    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(window.location.href).not.toBe('/dashboard');
  });

  it('closes the dialog and preserves entered content when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor />);

    await user.type(screen.getByLabelText(/title/i), 'Draft title');
    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/title/i)).toHaveValue('Draft title');
    expect(window.location.href).not.toBe('/dashboard');
  });

  it('navigates to /dashboard when Discard is clicked in the dialog', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor />);

    await user.type(screen.getByLabelText(/content \(markdown\)/i), '# Hello');
    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
    await user.click(screen.getByRole('button', { name: /^discard$/i }));

    expect(window.location.href).toBe('/dashboard');
  });
});

describe('HandoutEditor — edit mode (initialHandout prop)', () => {
  it('renders form fields with values from initialHandout', () => {
    render(<HandoutEditor initialHandout={draftInitialHandout} />);

    expect(screen.getByRole('heading', { name: /edit handout/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue(draftInitialHandout.title);
    expect(screen.getByLabelText(/content \(markdown\)/i)).toHaveValue(draftInitialHandout.markdownContent);
  });

  it('enables Save when initialHandout.shareToken is non-null', () => {
    render(<HandoutEditor initialHandout={publishedInitialHandout} />);

    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });

  it('calls publish when a draft still has a share token', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ shareToken: '22222222-2222-4222-8222-222222222222' }),
    } as Response);

    render(
      <HandoutEditor
        initialHandout={{
          ...draftInitialHandout,
          shareToken: '22222222-2222-4222-8222-222222222222',
        }}
      />,
    );

    expect(screen.getByText(/click Share to publish/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Published/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^share$/i }));

    expect(fetchMock).toHaveBeenCalledWith(`/api/handouts/${draftInitialHandout.id}/publish`, { method: 'POST' });
  });

  it('opens share dialog without calling fetch when initialHandout.shareToken is set', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    render(<HandoutEditor initialHandout={publishedInitialHandout} />);

    await user.click(screen.getByRole('button', { name: /^share$/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Handout published!')).toBeInTheDocument();
  });

  it('is not dirty on initial render — back navigates without discard dialog', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor initialHandout={draftInitialHandout} />);

    await user.click(screen.getByRole('button', { name: /back to dashboard/i }));

    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(window.location.href).toBe('/dashboard');
  });

  it('disables Share when the form is dirty in edit mode', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor initialHandout={publishedInitialHandout} />);

    await user.type(screen.getByLabelText(/title/i), ' updated');

    expect(screen.getByRole('button', { name: /^share$/i })).toBeDisabled();
  });
});

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

describe('HandoutEditor markdown help', () => {
  it('shows Markdown help beside Content (Markdown) on a fresh editor and an existing handout', () => {
    const { unmount } = render(<HandoutEditor />);
    const freshLabel = screen.getByText('Content (Markdown)');
    expect(freshLabel.parentElement).toContainElement(screen.getByRole('button', { name: 'Markdown help' }));
    unmount();

    render(<HandoutEditor initialHandout={draftInitialHandout} />);
    const editLabel = screen.getByText('Content (Markdown)');
    expect(editLabel.parentElement).toContainElement(screen.getByRole('button', { name: 'Markdown help' }));
  });

  it('shows every guide label and one rendered fragment per example', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor />);

    await user.click(screen.getByRole('button', { name: 'Markdown help' }));

    const dialog = screen.getByRole('dialog', { name: /markdown tips/i });
    for (const example of MARKDOWN_GUIDE_EXAMPLES) {
      expect(dialog).toHaveTextContent(example.label);
      expect(dialog.innerHTML).toContain(RENDERED_FRAGMENT_BY_ID[example.id]);
    }
  });

  it('leaves the textarea value unchanged after the dialog closes', async () => {
    const user = userEvent.setup();
    render(<HandoutEditor />);

    const textarea = screen.getByLabelText(/content \(markdown\)/i);
    await user.type(textarea, 'Keep this line');
    await user.click(screen.getByRole('button', { name: 'Markdown help' }));
    await user.click(screen.getByRole('button', { name: /^close$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /markdown tips/i })).not.toBeInTheDocument();
    });
    expect(textarea).toHaveValue('Keep this line');
  });
});

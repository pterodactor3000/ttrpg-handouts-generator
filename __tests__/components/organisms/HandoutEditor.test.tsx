// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import HandoutEditor from '@/components/organisms/HandoutEditor';
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
});

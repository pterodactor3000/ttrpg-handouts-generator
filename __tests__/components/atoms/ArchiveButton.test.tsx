// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ArchiveButton from '@/components/atoms/ArchiveButton';
import { moveHandoutCardToArchivedSection } from '@/lib/archive-handout-card-dom';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/archive-handout-card-dom', () => ({
  moveHandoutCardToArchivedSection: vi.fn(),
}));

const fetchMock = vi.fn<typeof fetch>();

function renderArchiveButtonInCard() {
  return render(
    <article>
      <ArchiveButton handoutId="handout-id-123" handoutTitle="Test Handout" />
    </article>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(moveHandoutCardToArchivedSection).mockReset();
  vi.mocked(toast.error).mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);

  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '', origin: 'http://localhost' },
  });
});

describe('ArchiveButton', () => {
  it('renders Archive button without opening the dialog initially', () => {
    renderArchiveButtonInCard();

    expect(screen.getByRole('button', { name: /^archive$/i })).toBeInTheDocument();
    expect(screen.queryByText('Archive handout?')).not.toBeInTheDocument();
  });

  it('opens the confirmation dialog with the handout title when Archive is clicked', async () => {
    const user = userEvent.setup();
    renderArchiveButtonInCard();

    await user.click(screen.getByRole('button', { name: /^archive$/i }));

    expect(screen.getByText('Archive handout?')).toBeInTheDocument();
    expect(screen.getByText(/Test Handout/)).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^archive$/i })).toBeInTheDocument();
  });

  it('closes the dialog without calling fetch when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderArchiveButtonInCard();

    await user.click(screen.getByRole('button', { name: /^archive$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Archive handout?')).not.toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('archives via POST and moves the card when Archive is confirmed', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'handout-id-123' }),
    } as Response);

    const { container } = renderArchiveButtonInCard();

    await user.click(screen.getByRole('button', { name: /^archive$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^archive$/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/handouts/handout-id-123/archive', { method: 'POST' });
    });

    expect(moveHandoutCardToArchivedSection).toHaveBeenCalledTimes(1);
    expect(container.querySelector('article')).toBeInTheDocument();
  });

  it('shows a toast error and keeps the card when archive fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed' }),
    } as Response);

    const { container } = renderArchiveButtonInCard();

    await user.click(screen.getByRole('button', { name: /^archive$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^archive$/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to archive handout — please try again');
    });

    expect(moveHandoutCardToArchivedSection).not.toHaveBeenCalled();
    expect(container.querySelector('article')).toBeInTheDocument();
  });
});

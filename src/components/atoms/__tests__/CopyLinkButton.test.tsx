// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CopyLinkButton from '@/components/atoms/CopyLinkButton';

const writeTextMock = vi.fn<[string], Promise<void>>();

function installClipboardMock() {
  writeTextMock.mockReset();
  writeTextMock.mockResolvedValue(undefined);

  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { href: '', origin: 'http://localhost' },
  });

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      clipboard: {
        writeText: writeTextMock,
      },
    },
  });
}

afterEach(cleanup);

beforeEach(() => {
  installClipboardMock();
});

describe('CopyLinkButton', () => {
  it('copies the full share URL on click', async () => {
    const user = userEvent.setup();
    render(<CopyLinkButton shareToken="share-token-123" />);
    installClipboardMock();

    await user.click(screen.getByRole('button', { name: /copy link/i }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost/share/share-token-123');
    });
  });

  it('shows Copied! after a successful clipboard write', async () => {
    const user = userEvent.setup();
    render(<CopyLinkButton shareToken="share-token-123" />);
    installClipboardMock();

    await user.click(screen.getByRole('button', { name: /copy link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copied!/i })).toBeInTheDocument();
    });
  });

  it('shows Copy failed when clipboard write is rejected', async () => {
    const user = userEvent.setup();
    render(<CopyLinkButton shareToken="share-token-123" />);

    writeTextMock.mockReset();
    writeTextMock.mockRejectedValueOnce(new Error('Clipboard denied'));
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: writeTextMock,
        },
      },
    });

    await user.click(screen.getByRole('button', { name: /copy link/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy failed/i })).toBeInTheDocument();
    });
  });
});

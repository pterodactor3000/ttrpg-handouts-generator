import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
}

const ShareDialog = ({ open, onClose, shareUrl }: ShareDialogProps) => {
  const [copyButtonLabel, setCopyButtonLabel] = useState('Copy link');

  if (!open) {
    return null;
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyButtonLabel('Copied!');
      setTimeout(() => {
        setCopyButtonLabel('Copy link');
      }, 2000);
    } catch {
      setCopyButtonLabel('Copy failed');
      setTimeout(() => {
        setCopyButtonLabel('Copy link');
      }, 2000);
    }
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-semibold text-white">Handout published!</h2>
        <p className="mb-4 text-sm text-white/60">
          Share this link with your players. Anyone with the link can view the handout.
        </p>

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none"
            onFocus={(event) => {
              event.target.select();
            }}
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => void handleCopyLink()}
            className={cn(
              'flex-1 transition-colors',
              copyButtonLabel === 'Copied!' && 'border-green-500/50 bg-green-700/40 text-green-200',
            )}
          >
            {copyButtonLabel}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ShareDialog };

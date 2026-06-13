import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
}

const ShareDialog = ({ open, onClose, shareUrl }: ShareDialogProps) => {
  const [copyButtonLabel, setCopyButtonLabel] = useState('Copy link');
  const [isCopying, setIsCopying] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const scheduleReset = () => {
    if (resetTimeoutRef.current !== null) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      setCopyButtonLabel('Copy link');
    }, 2000);
  };

  const handleCopyLink = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyButtonLabel('Copied!');
      scheduleReset();
    } catch {
      setCopyButtonLabel('Copy failed');
      scheduleReset();
    } finally {
      setIsCopying(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (resetTimeoutRef.current !== null) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      setCopyButtonLabel('Copy link');
      setIsCopying(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle id="share-dialog-title">Handout published!</DialogTitle>
          <DialogDescription>
            Share this link with your players. Anyone with the link can view the handout.
          </DialogDescription>
        </DialogHeader>

        <input
          type="text"
          readOnly
          value={shareUrl}
          className="border-surface bg-surface text-muted-foreground w-full rounded-md border px-3 py-2 text-sm outline-none"
          onFocus={(event) => {
            event.target.select();
          }}
        />

        <DialogFooter className="gap-3 sm:justify-stretch">
          <Button
            onClick={() => void handleCopyLink()}
            disabled={isCopying}
            className={cn(
              'flex-1 transition-colors',
              copyButtonLabel === 'Copied!' &&
                'border-brand-accent-light bg-brand-accent-muted text-brand-accent-light hover:bg-brand-accent-muted hover:text-brand-accent-light',
            )}
          >
            {isCopying ? <span className="loader loader-sm" aria-hidden="true" /> : copyButtonLabel}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ShareDialog };

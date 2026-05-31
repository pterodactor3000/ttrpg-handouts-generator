import { useState } from 'react';
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton className="border-white/10 bg-gray-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle id="share-dialog-title" className="text-white">
            Handout published!
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Share this link with your players. Anyone with the link can view the handout.
          </DialogDescription>
        </DialogHeader>

        <input
          type="text"
          readOnly
          value={shareUrl}
          className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none"
          onFocus={(event) => {
            event.target.select();
          }}
        />

        <DialogFooter className="gap-3 sm:justify-stretch">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ShareDialog };

import { useEffect, useRef, useState } from 'react';
import { Check, Share2, X } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

interface CopyLinkButtonProps {
  shareToken: string;
}

type CopyButtonState = 'idle' | 'copying' | 'copied' | 'failed';

function getCopyButtonName(copyButtonState: CopyButtonState): string {
  if (copyButtonState === 'copied') {
    return 'Copied';
  }
  if (copyButtonState === 'failed') {
    return 'Copy failed';
  }
  return 'Copy link';
}

const CopyLinkButton = ({ shareToken }: CopyLinkButtonProps) => {
  const [copyButtonState, setCopyButtonState] = useState<CopyButtonState>('idle');
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessibleName = getCopyButtonName(copyButtonState);

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
      setCopyButtonState('idle');
    }, 2000);
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;

    setCopyButtonState('copying');
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyButtonState('copied');
      scheduleReset();
    } catch {
      setCopyButtonState('failed');
      scheduleReset();
    }
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={() => void handleCopyLink()}
      disabled={copyButtonState === 'copying'}
      aria-label={accessibleName}
      title={accessibleName}
      className={cn(
        'border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
        copyButtonState === 'copied' &&
          'border-primary/30 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
      )}
    >
      {copyButtonState === 'copying' ? (
        <span className="loader loader-sm" aria-hidden="true" />
      ) : copyButtonState === 'copied' ? (
        <Check aria-hidden="true" />
      ) : copyButtonState === 'failed' ? (
        <X aria-hidden="true" />
      ) : (
        <Share2 aria-hidden="true" />
      )}
    </Button>
  );
};

export default CopyLinkButton;

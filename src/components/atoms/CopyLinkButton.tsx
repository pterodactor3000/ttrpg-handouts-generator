import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';

interface CopyLinkButtonProps {
  shareToken: string;
}

const CopyLinkButton = ({ shareToken }: CopyLinkButtonProps) => {
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
    const shareUrl = `${window.location.origin}/share/${shareToken}`;

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

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => void handleCopyLink()}
      disabled={isCopying}
      className={cn(
        'border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
        copyButtonLabel === 'Copied!' &&
          'border-primary/30 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary',
      )}
    >
      {isCopying ? <span className="loader loader-sm" aria-hidden="true" /> : copyButtonLabel}
    </Button>
  );
};

export default CopyLinkButton;

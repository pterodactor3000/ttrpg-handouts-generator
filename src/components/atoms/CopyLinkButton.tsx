import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';

interface CopyLinkButtonProps {
  shareToken: string;
}

const CopyLinkButton = ({ shareToken }: CopyLinkButtonProps) => {
  const [copyButtonLabel, setCopyButtonLabel] = useState('Copy link');
  const [isCopying, setIsCopying] = useState(false);

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;

    setIsCopying(true);
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
        'border-surface bg-surface text-muted-foreground hover:bg-accent hover:text-foreground',
        copyButtonLabel === 'Copied!' &&
          'border-brand-accent-light bg-brand-accent-muted text-brand-accent-light hover:bg-brand-accent-muted hover:text-brand-accent-light',
      )}
    >
      {isCopying ? <span className="loader loader-sm" aria-hidden="true" /> : copyButtonLabel}
    </Button>
  );
};

export default CopyLinkButton;

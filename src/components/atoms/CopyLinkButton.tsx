import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/button';

interface CopyLinkButtonProps {
  shareToken: string;
}

const CopyLinkButton = ({ shareToken }: CopyLinkButtonProps) => {
  const [copyButtonLabel, setCopyButtonLabel] = useState('Copy link');

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;

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

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => void handleCopyLink()}
      className={cn(
        'border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
        copyButtonLabel === 'Copied!' && 'border-green-500/50 bg-green-700/40 text-green-200',
      )}
    >
      {copyButtonLabel}
    </Button>
  );
};

export default CopyLinkButton;

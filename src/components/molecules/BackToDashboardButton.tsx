import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

interface BackToDashboardButtonProps {
  onClick?: () => void;
  href?: string;
  label?: string;
  className?: string;
}

function BackToDashboardButton({
  onClick,
  href = '/dashboard',
  label = 'Back to dashboard',
  className,
}: BackToDashboardButtonProps) {
  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }

    window.location.href = href;
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className={cn('text-muted-foreground hover:bg-accent hover:text-foreground mb-4 -ml-2', className)}
    >
      <ArrowLeft />
      {label}
    </Button>
  );
}

export { BackToDashboardButton };

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/atoms/button';

interface BackToDashboardButtonProps {
  onClick?: () => void;
}

function BackToDashboardButton({ onClick }: BackToDashboardButtonProps) {
  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className="text-muted-foreground hover:bg-accent hover:text-foreground mb-4 -ml-2"
    >
      <ArrowLeft />
      Back to dashboard
    </Button>
  );
}

export { BackToDashboardButton };

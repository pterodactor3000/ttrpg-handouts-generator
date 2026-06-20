import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { moveHandoutCardToArchivedSection } from '@/lib/archive-handout-card-dom';
import { cn } from '@/lib/utils';

interface ArchiveButtonProps {
  handoutId: string;
  handoutTitle: string;
}

const ArchiveButton = ({ handoutId, handoutTitle }: ArchiveButtonProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/handouts/${handoutId}/archive`, { method: 'POST' });

      if (!response.ok) {
        setIsLoading(false);
        setConfirmOpen(false);
        toast.error('Failed to archive handout — please try again');
        return;
      }

      setConfirmOpen(false);
      if (containerRef.current) {
        moveHandoutCardToArchivedSection(containerRef.current);
      }
    } catch {
      setIsLoading(false);
      setConfirmOpen(false);
      toast.error('Failed to archive handout — please try again');
    }
  };

  return (
    <span ref={containerRef}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setConfirmOpen(true);
        }}
        className={cn('border-surface bg-surface text-muted-foreground hover:bg-accent hover:text-foreground')}
      >
        Archive
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive handout?</DialogTitle>
            <DialogDescription>
              &ldquo;{handoutTitle}&rdquo; will be archived. Players with the share link can still view it.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                setConfirmOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button disabled={isLoading} onClick={() => void handleConfirm()}>
              {isLoading ? 'Archiving…' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
};

export default ArchiveButton;

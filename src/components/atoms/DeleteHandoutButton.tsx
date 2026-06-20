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
import { removePermanentDeletedHandoutCard } from '@/lib/archive-handout-card-dom';
import { cn } from '@/lib/utils';

interface DeleteHandoutButtonProps {
  handoutId: string;
  handoutTitle: string;
  hasShareLink: boolean;
}

const DeleteHandoutButton = ({ handoutId, handoutTitle, hasShareLink }: DeleteHandoutButtonProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/handouts/${handoutId}`, { method: 'DELETE' });

      if (!response.ok) {
        setIsLoading(false);
        setConfirmOpen(false);
        toast.error('Failed to delete handout — please try again');
        return;
      }

      setConfirmOpen(false);
      if (containerRef.current) {
        removePermanentDeletedHandoutCard(containerRef.current);
      }
    } catch {
      setIsLoading(false);
      setConfirmOpen(false);
      toast.error('Failed to delete handout — please try again');
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
        className={cn('border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-300')}
      >
        Delete
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete handout permanently?</DialogTitle>
            <DialogDescription>
              {hasShareLink
                ? `\u201c${handoutTitle}\u201d will be permanently deleted. Players will no longer be able to access the share link.`
                : `\u201c${handoutTitle}\u201d will be permanently deleted. This cannot be undone.`}
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
            <Button variant="destructive" disabled={isLoading} onClick={() => void handleConfirm()}>
              {isLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
};

export default DeleteHandoutButton;

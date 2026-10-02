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
import { moveRestoredHandoutCard } from '@/lib/archive-handout-card-dom';
import { cn } from '@/lib/utils';

interface RestoreHandoutButtonProps {
  handoutId: string;
  handoutTitle: string;
}

interface UnarchiveResponse {
  id: string;
  status: 'draft' | 'published';
  shareToken: string | null;
}

type RestoreTarget = 'draft' | 'published';

const RESTORE_FAILED_MESSAGE = 'Failed to restore handout. Please try again.';

function isUnarchiveResponse(value: unknown): value is UnarchiveResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const statusIsKnown = record.status === 'draft' || record.status === 'published';
  const shareTokenIsKnown = record.shareToken === null || typeof record.shareToken === 'string';
  return typeof record.id === 'string' && statusIsKnown && shareTokenIsKnown;
}

function readErrorMessage(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const errorMessage = (value as { error?: unknown }).error;
  return typeof errorMessage === 'string' ? errorMessage : null;
}

const RestoreHandoutButton = ({ handoutId, handoutTitle }: RestoreHandoutButtonProps) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleRestore = async (target: RestoreTarget) => {
    setIsLoading(true);
    setValidationMessage(null);

    try {
      const response = await fetch(`/api/handouts/${handoutId}/unarchive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      if (response.status === 422) {
        const payload: unknown = await response.json().catch(() => null);
        setIsLoading(false);
        setValidationMessage(readErrorMessage(payload) ?? 'This handout cannot be published yet.');
        return;
      }

      if (!response.ok) {
        setIsLoading(false);
        setConfirmOpen(false);
        toast.error(RESTORE_FAILED_MESSAGE);
        return;
      }

      const payload: unknown = await response.json();
      if (!isUnarchiveResponse(payload)) {
        setIsLoading(false);
        setConfirmOpen(false);
        toast.error(RESTORE_FAILED_MESSAGE);
        return;
      }

      setConfirmOpen(false);
      if (containerRef.current) {
        moveRestoredHandoutCard({
          restoreButtonContainer: containerRef.current,
          targetStatus: payload.status,
          shareToken: payload.shareToken,
        });
      }
    } catch (restoreError: unknown) {
      console.error('Failed to restore handout:', restoreError);
      setIsLoading(false);
      setConfirmOpen(false);
      toast.error(RESTORE_FAILED_MESSAGE);
    }
  };

  return (
    <span ref={containerRef}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          setValidationMessage(null);
          setConfirmOpen(true);
        }}
        className={cn(
          'border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer',
        )}
      >
        Restore
      </Button>

      <Dialog
        open={confirmOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen && isLoading) {
            return;
          }
          setConfirmOpen(isOpen);
          if (!isOpen) {
            setValidationMessage(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn('moon-chrome bg-popover text-popover-foreground border-border sm:max-w-md')}
        >
          <DialogHeader>
            <DialogTitle>Restore handout?</DialogTitle>
            <DialogDescription>
              Choose draft to return &ldquo;{handoutTitle}&rdquo; to Drafts. An existing player link stops working until
              you publish again. Choose published to reopen an existing link, or to create one when this handout never
              had one.
            </DialogDescription>
          </DialogHeader>

          {validationMessage !== null && (
            <p role="alert" className="text-destructive text-sm">
              {validationMessage}
            </p>
          )}

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
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => {
                void handleRestore('draft');
              }}
            >
              Draft
            </Button>
            <Button
              disabled={isLoading}
              onClick={() => {
                void handleRestore('published');
              }}
            >
              {isLoading ? 'Restoring...' : 'Published'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  );
};

export default RestoreHandoutButton;

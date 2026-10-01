import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { PasswordToggle } from '@/components/atoms/PasswordToggle';
import { ServerError } from '@/components/atoms/ServerError';
import { FormField } from '@/components/molecules/FormField';
import { cn } from '@/lib/utils';

const GENERIC_ERROR_MESSAGE = 'Failed to schedule account deletion';

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  } catch (error) {
    console.error('Failed to read the account deletion response:', error);
  }

  return GENERIC_ERROR_MESSAGE;
}

function readScheduledAt(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !('scheduledAt' in body) || typeof body.scheduledAt !== 'string') {
    return null;
  }

  return body.scheduledAt;
}

function DeleteAccountDialog() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleConfirm() {
    if (!password) {
      setErrorMessage('Password is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/account/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response));
        setIsSubmitting(false);
        return;
      }

      const scheduledAt = readScheduledAt(await response.json());
      if (!scheduledAt) {
        setErrorMessage(GENERIC_ERROR_MESSAGE);
        setIsSubmitting(false);
        return;
      }

      window.location.assign(`/account-closed?at=${encodeURIComponent(scheduledAt)}`);
    } catch (error) {
      console.error('Failed to submit account deletion:', error);
      setErrorMessage(GENERIC_ERROR_MESSAGE);
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => {
          setConfirmOpen(true);
        }}
      >
        Delete account
      </Button>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (isSubmitting) {
            return;
          }
          setConfirmOpen(open);
          if (!open) {
            setErrorMessage('');
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={cn('moon-chrome bg-popover text-popover-foreground border-border sm:max-w-md')}
        >
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This closes the account and signs you out. Handouts stay available for 30 days, then they are deleted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <FormField
            id="delete-account-password"
            label="Current password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            icon={<Lock className="size-4" />}
            endContent={
              <PasswordToggle
                visible={showPassword}
                onToggle={() => {
                  setShowPassword(!showPassword);
                }}
              />
            }
          />

          <ServerError message={errorMessage} />

          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setConfirmOpen(false);
                setErrorMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => {
                void handleConfirm();
              }}
            >
              {isSubmitting ? 'Deleting...' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { DeleteAccountDialog };

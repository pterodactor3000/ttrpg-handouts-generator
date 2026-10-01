import { useState, type SubmitEvent } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/atoms/button';
import { PasswordToggle } from '@/components/atoms/PasswordToggle';
import { ServerError } from '@/components/atoms/ServerError';
import { FormField } from '@/components/molecules/FormField';

const GENERIC_ERROR_MESSAGE = 'Failed to change password';
const SUCCESS_MESSAGE = 'Password updated.';

interface FormStatus {
  status: 'idle' | 'error' | 'success';
  message: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
      return body.error;
    }
  } catch (error) {
    console.error('Failed to read the password change response:', error);
  }

  return GENERIC_ERROR_MESSAGE;
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({ status: 'idle', message: '' });

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError('');
    setFormStatus({ status: 'idle', message: '' });

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFieldError('Enter the current password, a new password, and the confirmation.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFieldError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      if (!response.ok) {
        setFormStatus({ status: 'error', message: await readErrorMessage(response) });
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFormStatus({ status: 'success', message: SUCCESS_MESSAGE });
    } catch (error) {
      console.error('Failed to submit the password change:', error);
      setFormStatus({ status: 'error', message: GENERIC_ERROR_MESSAGE });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <FormField
        id="current-password"
        label="Current password"
        type={showCurrentPassword ? 'text' : 'password'}
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showCurrentPassword}
            onToggle={() => {
              setShowCurrentPassword(!showCurrentPassword);
            }}
          />
        }
      />
      <FormField
        id="new-password"
        label="New password"
        type={showNewPassword ? 'text' : 'password'}
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showNewPassword}
            onToggle={() => {
              setShowNewPassword(!showNewPassword);
            }}
          />
        }
      />
      <FormField
        id="confirm-password"
        label="Confirm new password"
        type={showConfirmPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        error={fieldError}
        icon={<Lock className="size-4" />}
        endContent={
          <PasswordToggle
            visible={showConfirmPassword}
            onToggle={() => {
              setShowConfirmPassword(!showConfirmPassword);
            }}
          />
        }
      />

      <ServerError message={formStatus.status === 'error' ? formStatus.message : null} />
      {formStatus.status === 'success' ? (
        <p className="text-foreground text-sm" role="status">
          {formStatus.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Updating password...' : 'Update password'}
      </Button>
    </form>
  );
}

export { ChangePasswordForm };

import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Input } from '@/components/atoms/input';
import { cn } from '@/lib/utils';

const inputBase =
  'h-auto border-border bg-background py-2 pl-10 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring dark:bg-background';

interface FormFieldProps {
  id: string;
  name?: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: ReactNode;
  icon: ReactNode;
  endContent?: ReactNode;
  autoComplete?: string;
}

export function FormField({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  icon,
  endContent,
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-foreground mb-2 block text-base">
        {label}
      </label>
      <div className="relative">
        <span className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2">{icon}</span>
        <Input
          id={id}
          name={name ?? id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={cn(
            inputBase,
            endContent && 'pr-10',
            error
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive'
              : 'border-border focus-visible:border-border focus-visible:ring-ring',
          )}
        />
        {endContent}
      </div>
      {error ? (
        <p className="text-destructive mt-1 flex items-center gap-1 text-xs">
          <CircleAlert className="size-3" />
          {error}
        </p>
      ) : (
        hint
      )}
    </div>
  );
}

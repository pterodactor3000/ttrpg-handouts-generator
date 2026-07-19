import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTailwindMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'border-color': ['border-surface', 'border-brand-accent'],
      'bg-color': ['bg-app', 'bg-surface', 'bg-brand-accent-muted'],
      'text-color': ['text-brand-accent', 'text-brand-accent-light'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTailwindMerge(clsx(inputs));
}

import { useState } from 'react';
import { Input } from '@/components/atoms/input';
import { cn } from '@/lib/utils';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const TagsInput = ({ tags, onChange }: TagsInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="border-surface bg-surface text-foreground flex items-center gap-1 rounded-none border px-3 py-1 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => {
              removeTag(tag);
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground ml-1 rounded-none leading-none transition-colors',
            )}
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <Input
        type="text"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)' : 'Add another tag'}
        className="border-surface bg-surface text-foreground dark:bg-surface h-auto w-auto min-w-32 flex-1 py-1 text-sm shadow-none focus-visible:ring-2"
      />
    </div>
  );
};

export { TagsInput };

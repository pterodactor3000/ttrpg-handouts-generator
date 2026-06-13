import { useState } from 'react';
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
          className="border-surface bg-surface text-foreground flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
        >
          {tag}
          <button
            type="button"
            onClick={() => {
              removeTag(tag);
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground ml-1 rounded-full leading-none transition-colors',
            )}
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)' : 'Add another tag'}
        className="border-surface bg-surface text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50 min-w-32 flex-1 rounded-md border px-3 py-1 text-sm outline-none focus:ring-2"
      />
    </div>
  );
};

export { TagsInput };

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
        <span key={tag} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
          {tag}
          <button
            type="button"
            onClick={() => {
              removeTag(tag);
            }}
            className={cn('ml-1 rounded-full text-white/60 transition-colors hover:text-white', 'leading-none')}
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
        className="min-w-32 flex-1 rounded-md border border-white/20 bg-white/5 px-3 py-1 text-sm text-white placeholder-white/30 outline-none focus:border-white/50"
      />
    </div>
  );
};

export { TagsInput };

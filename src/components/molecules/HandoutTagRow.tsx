import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/atoms/dialog';
import { useFittedTagChips } from '@/components/hooks/useFittedTagChips';
import { cn } from '@/lib/utils';

interface HandoutTagRowProps {
  tags: string[];
  handoutTitle: string;
}

const OVERFLOW_BUTTON_CLASS_NAME =
  'inline-flex shrink-0 cursor-pointer items-center rounded-[0.5rem] bg-muted px-3 py-1 text-sm leading-6 font-medium whitespace-nowrap text-foreground';

const HandoutTagRow = ({ tags, handoutTitle }: HandoutTagRowProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { rowRef, fitted } = useFittedTagChips(tags, OVERFLOW_BUTTON_CLASS_NAME);
  const showOverflow = fitted?.showOverflow ?? false;
  const visibleTags = showOverflow ? tags.slice(0, fitted?.visibleCount ?? 0) : tags;
  const hiddenCount = fitted?.hiddenCount ?? 0;

  return (
    <>
      <div ref={rowRef} className="mb-3 flex h-8 shrink-0 flex-nowrap items-center gap-2 overflow-hidden">
        {visibleTags.map((tag, index) => (
          <span key={`${tag}-${index}`} data-moon-chip data-tag-chip className="shrink-0 px-3 py-1 whitespace-nowrap">
            {tag}
          </span>
        ))}
        {showOverflow && (
          <button
            type="button"
            className={OVERFLOW_BUTTON_CLASS_NAME}
            aria-label={`Show all ${tags.length} tags`}
            onClick={() => {
              setIsDialogOpen(true);
            }}
          >
            +{hiddenCount}
          </button>
        )}
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={cn('moon-chrome sm:max-w-md')}>
          <DialogHeader>
            <DialogTitle>Tags</DialogTitle>
            <DialogDescription>{handoutTitle}</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-60 flex-wrap gap-2 overflow-y-auto">
            {tags.map((tag, index) => (
              <span key={`${tag}-${index}`} data-moon-chip className="px-3 py-1 whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export { HandoutTagRow };

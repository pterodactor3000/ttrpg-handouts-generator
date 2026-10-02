import { MARKDOWN_GUIDE_EXAMPLES } from '@/lib/markdown-guide';
import { renderHandoutHtml } from '@/lib/handout-renderer';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/atoms/dialog';

interface MarkdownTipsDialogProps {
  open: boolean;
  onClose: () => void;
}

const MarkdownTipsDialog = ({ open, onClose }: MarkdownTipsDialogProps) => {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn('moon-chrome bg-popover text-popover-foreground border-border overflow-visible sm:max-w-lg')}
      >
        <DialogHeader>
          <DialogTitle>Markdown tips</DialogTitle>
          <DialogDescription>Syntax the handout preview already renders.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          <ul className="flex flex-col gap-4">
            {MARKDOWN_GUIDE_EXAMPLES.map((example) => (
              <li key={example.id} className="flex flex-col gap-2">
                <p className="text-foreground text-sm font-medium">{example.label}</p>
                <div className="font-mono text-sm whitespace-pre-wrap">{example.markdown}</div>
                <div
                  // renderHandoutHtml sanitizes via rehype-sanitize. The XSS boundary is the renderer tests.
                  dangerouslySetInnerHTML={{ __html: renderHandoutHtml(example.markdown) }}
                />
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { MarkdownTipsDialog };

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
        className={cn(
          'moon-chrome bg-popover text-popover-foreground border-border flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl',
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Markdown tips</DialogTitle>
          <DialogDescription>Syntax the handout preview already renders.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-auto overflow-y-auto">
          <ul className="divide-border divide-y">
            {MARKDOWN_GUIDE_EXAMPLES.map((example) => (
              <li key={example.id} data-markdown-tip={example.id} className="flex flex-col gap-3 py-4">
                <p className="text-foreground text-sm font-medium">{example.label}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-muted-foreground text-xs">Markdown</p>
                    <div data-markdown-source className="text-foreground font-mono text-sm whitespace-pre-wrap">
                      {example.markdown}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-muted-foreground text-xs">Preview</p>
                    <div
                      data-markdown-preview
                      className={cn(
                        'prose prose-sm max-w-none overflow-x-auto',
                        '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
                      )}
                      // renderHandoutHtml sanitizes via rehype-sanitize. The XSS boundary is the renderer tests.
                      dangerouslySetInnerHTML={{ __html: renderHandoutHtml(example.markdown) }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { MarkdownTipsDialog };

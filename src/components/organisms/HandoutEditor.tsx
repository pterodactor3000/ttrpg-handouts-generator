import { useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { BackgroundCategory } from '@/types';
import { renderHandoutHtml } from '@/lib/handout-renderer';
import { BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { BackgroundPicker } from '@/components/molecules/BackgroundPicker';
import { TagsInput } from '@/components/molecules/TagsInput';
import { ShareDialog } from '@/components/organisms/ShareDialog';
import { Button } from '@/components/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { cn } from '@/lib/utils';

type SaveApiResponse = { id: string } | { error: string };
type PublishApiResponse = { shareToken: string } | { error: string };

const serializeFormState = (
  titleValue: string,
  markdownValue: string,
  backgroundValue: BackgroundCategory | null,
  tagsValue: string[],
) =>
  JSON.stringify({
    title: titleValue,
    markdownContent: markdownValue,
    backgroundCategory: backgroundValue,
    tags: [...tagsValue].sort(),
  });

const fieldInputClass = cn(
  'border-surface bg-surface text-foreground placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/50',
);

const HandoutEditor = () => {
  const [title, setTitle] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [backgroundCategory, setBackgroundCategory] = useState<BackgroundCategory | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [handoutId, setHandoutId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeFormState('', '', null, []));

  const isDirty = useMemo(
    () => serializeFormState(title, markdownContent, backgroundCategory, tags) !== savedSnapshot,
    [title, markdownContent, backgroundCategory, tags, savedSnapshot],
  );

  const navigateToDashboard = () => {
    window.location.href = '/dashboard';
  };

  const handleBackClick = () => {
    if (isDirty) {
      setConfirmBackOpen(true);
      return;
    }
    navigateToDashboard();
  };

  const renderedPreview = useMemo(() => renderHandoutHtml(markdownContent), [markdownContent]);

  const previewBackground = backgroundCategory ? BACKGROUND_CONFIGS[backgroundCategory].cssBackground : undefined;

  const handleSave = async () => {
    if (!backgroundCategory) {
      setSaveError('Please select a background category before saving.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const requestBody = { title, markdownContent, backgroundCategory, tags };
      const url = handoutId ? `/api/handouts/${handoutId}` : '/api/handouts';
      const method = handoutId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseJson: unknown = await response.json();
      const responseData = responseJson as SaveApiResponse;

      if (!response.ok) {
        setSaveError('error' in responseData ? responseData.error : 'Failed to save handout.');
        return;
      }

      if ('id' in responseData) {
        setHandoutId(responseData.id);
      }

      setSavedSnapshot(serializeFormState(title, markdownContent, backgroundCategory, tags));
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!handoutId) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const response = await fetch(`/api/handouts/${handoutId}/publish`, { method: 'POST' });
      const responseJson: unknown = await response.json();
      const responseData = responseJson as PublishApiResponse;

      if (!response.ok) {
        setPublishError('error' in responseData ? responseData.error : 'Failed to publish handout.');
        return;
      }

      if ('shareToken' in responseData) {
        setShareToken(responseData.shareToken);
        setShareDialogOpen(true);
      }
    } catch {
      setPublishError('Network error. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const shareUrl = shareToken ? `${window.location.origin}/share/${shareToken}` : '';

  return (
    <div className="bg-cosmic min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="text-muted-foreground hover:bg-accent hover:text-foreground mb-4 -ml-2"
        >
          <ArrowLeft />
          Back to dashboard
        </Button>
        <h1 className="text-brand-accent-light mb-6 text-2xl font-bold tracking-tight">New Handout</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Form column */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="handout-title" className="text-muted-foreground text-sm font-medium">
                Title
              </label>
              <input
                id="handout-title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                placeholder="Handout title…"
                maxLength={300}
                className={fieldInputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm font-medium">Background</span>
              <BackgroundPicker value={backgroundCategory} onChange={setBackgroundCategory} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="handout-markdown" className="text-muted-foreground text-sm font-medium">
                Content (Markdown)
              </label>
              <textarea
                id="handout-markdown"
                value={markdownContent}
                onChange={(event) => {
                  setMarkdownContent(event.target.value);
                }}
                placeholder="# My Handout&#10;&#10;Write your content here…"
                rows={16}
                maxLength={50000}
                className={cn(fieldInputClass, 'resize-y font-mono text-sm')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground text-sm font-medium">Tags</span>
              <TagsInput tags={tags} onChange={setTags} />
            </div>

            {saveError && <p className="text-destructive text-sm">{saveError}</p>}
            {publishError && <p className="text-destructive text-sm">{publishError}</p>}

            <div className="flex gap-3">
              <Button onClick={() => void handleSave()} disabled={isSaving || !!shareToken} className="flex-1">
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loader loader-sm" aria-hidden="true" />
                    Saving…
                  </span>
                ) : handoutId ? (
                  'Save changes'
                ) : (
                  'Save handout'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleShare()}
                disabled={!handoutId || isSaving || isPublishing || !!shareToken}
                className={cn('flex-1', !handoutId && 'cursor-not-allowed opacity-50')}
              >
                {isPublishing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="loader loader-sm" aria-hidden="true" />
                    Publishing…
                  </span>
                ) : (
                  'Share'
                )}
              </Button>
            </div>

            {handoutId && !shareToken && (
              <p className="text-muted-foreground text-xs">Draft saved — click Share to publish.</p>
            )}
            {shareToken && (
              <p className="text-brand-accent-light text-xs">
                Published —{' '}
                <button
                  className="hover:text-brand-accent underline"
                  onClick={() => {
                    setShareDialogOpen(true);
                  }}
                >
                  view share link
                </button>
              </p>
            )}
          </div>

          {/* Preview column */}
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-sm font-medium">Preview</span>
            <div
              className="flex min-h-64 justify-center rounded-lg p-4"
              style={{
                backgroundColor: 'var(--palette-preview-fallback)',
                backgroundImage: previewBackground,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <article className={cn('handout-article w-full max-w-2xl p-4 md:p-8')}>
                <h1 className="mb-6 text-3xl font-bold break-words">{title || 'Untitled'}</h1>
                {markdownContent ? (
                  <div
                    className="prose prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: renderedPreview }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm italic">Your rendered markdown will appear here…</p>
                )}
              </article>
            </div>
          </div>
        </div>
      </div>

      <ShareDialog
        open={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
        }}
        shareUrl={shareUrl}
      />

      <Dialog open={confirmBackOpen} onOpenChange={setConfirmBackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>You have unsaved edits. If you leave now, your changes will be lost.</DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-3 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmBackOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={navigateToDashboard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandoutEditor;

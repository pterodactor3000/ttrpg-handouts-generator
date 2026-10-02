import { useState, useMemo } from 'react';
import { CircleQuestionMark } from 'lucide-react';
import * as Sentry from '@sentry/astro';
import type { BackgroundCategory, HandoutStatus, InitialHandout } from '@/types';
import { renderHandoutHtml } from '@/lib/handout-renderer';
import { BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { BackgroundPicker } from '@/components/molecules/BackgroundPicker';
import { HandoutArticle } from '@/components/molecules/HandoutArticle';
import { TagsInput } from '@/components/molecules/TagsInput';
import { MarkdownTipsDialog } from '@/components/organisms/MarkdownTipsDialog';
import { ShareDialog } from '@/components/organisms/ShareDialog';
import { Button } from '@/components/atoms/button';
import { BackToDashboardButton } from '@/components/molecules/BackToDashboardButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms/dialog';
import { Input } from '@/components/atoms/input';
import { Textarea } from '@/components/atoms/textarea';
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

const HandoutEditor = ({ initialHandout }: { initialHandout?: InitialHandout }) => {
  const [title, setTitle] = useState(initialHandout?.title ?? '');
  const [markdownContent, setMarkdownContent] = useState(initialHandout?.markdownContent ?? '');
  const [backgroundCategory, setBackgroundCategory] = useState<BackgroundCategory | null>(
    initialHandout?.backgroundCategory ?? null,
  );
  const [tags, setTags] = useState<string[]>(initialHandout?.tags ?? []);
  const [handoutId, setHandoutId] = useState<string | null>(initialHandout?.id ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(initialHandout?.shareToken ?? null);
  const [handoutStatus, setHandoutStatus] = useState<HandoutStatus>(initialHandout?.status ?? 'draft');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [markdownTipsOpen, setMarkdownTipsOpen] = useState(false);
  const [confirmBackOpen, setConfirmBackOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    initialHandout
      ? serializeFormState(
          initialHandout.title,
          initialHandout.markdownContent,
          initialHandout.backgroundCategory,
          initialHandout.tags,
        )
      : serializeFormState('', '', null, []),
  );

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
    } catch (error) {
      Sentry.captureException(error);
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!handoutId || isDirty) return;

    if (shareToken && handoutStatus === 'published') {
      setShareDialogOpen(true);
      return;
    }

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
        setHandoutStatus('published');
        setShareDialogOpen(true);
      }
    } catch (error) {
      Sentry.captureException(error);
      setPublishError('Network error. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (!shareToken || typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/share/${shareToken}`;
  }, [shareToken]);

  return (
    <div className={cn('moon-chrome bg-background text-foreground min-h-screen p-4 md:p-8')}>
      <div className="mx-auto max-w-6xl">
        <BackToDashboardButton onClick={handleBackClick} />
        <h1 className="text-foreground mb-6 text-2xl font-bold tracking-tight">
          {initialHandout ? 'Edit Handout' : 'New Handout'}
        </h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Form column */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="handout-title" className="text-foreground text-base">
                Title
              </label>
              <Input
                id="handout-title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                placeholder="Handout title…"
                maxLength={300}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-foreground text-base">Background</span>
              <BackgroundPicker value={backgroundCategory} onChange={setBackgroundCategory} />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="handout-markdown" className="text-foreground text-base">
                  Content (Markdown)
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Markdown help"
                  onClick={() => {
                    setMarkdownTipsOpen(true);
                  }}
                >
                  <CircleQuestionMark />
                </Button>
              </div>
              <Textarea
                id="handout-markdown"
                value={markdownContent}
                onChange={(event) => {
                  setMarkdownContent(event.target.value);
                }}
                placeholder="# My Handout&#10;&#10;Write your content here…"
                rows={16}
                maxLength={50000}
                className="field-sizing-fixed min-h-0 resize-y font-mono text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-foreground text-base">Tags</span>
              <TagsInput tags={tags} onChange={setTags} />
            </div>

            {saveError && <p className="text-destructive text-sm">{saveError}</p>}
            {publishError && <p className="text-destructive text-sm">{publishError}</p>}

            <div className="flex gap-3">
              <Button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="bg-primary text-primary-foreground flex-1"
              >
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
                disabled={!handoutId || isSaving || isPublishing || isDirty}
                className={cn(
                  'border-border bg-card text-foreground flex-1',
                  !handoutId && 'cursor-not-allowed opacity-50',
                )}
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

            {handoutId && handoutStatus !== 'published' && (
              <p className="text-muted-foreground text-xs">Draft saved — click Share to publish.</p>
            )}
            {handoutStatus === 'published' && shareToken && (
              <p className="text-primary text-xs">
                Published —{' '}
                <button
                  type="button"
                  disabled={isDirty}
                  className={cn(
                    'hover:text-primary/80 underline',
                    isDirty && 'cursor-not-allowed no-underline opacity-50',
                  )}
                  onClick={() => {
                    if (isDirty) return;
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
            <span className="text-foreground text-base">Preview</span>
            <div
              className="flex min-h-64 justify-center rounded-lg p-4"
              style={{
                backgroundColor: 'var(--palette-preview-fallback)',
                backgroundImage: previewBackground,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <HandoutArticle
                title={title || 'Untitled'}
                html={markdownContent ? renderedPreview : ''}
                category={backgroundCategory ?? undefined}
                className="w-full max-w-2xl"
                emptyPlaceholder={
                  <p className="text-brand-accent-light text-sm italic">Your rendered markdown will appear here…</p>
                }
              />
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

      <MarkdownTipsDialog
        open={markdownTipsOpen}
        onClose={() => {
          setMarkdownTipsOpen(false);
        }}
      />

      <Dialog open={confirmBackOpen} onOpenChange={setConfirmBackOpen}>
        <DialogContent className={cn('moon-chrome bg-popover text-popover-foreground border-border sm:max-w-md')}>
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

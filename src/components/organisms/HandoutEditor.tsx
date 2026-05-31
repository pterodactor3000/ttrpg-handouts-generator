import { useState, useMemo } from 'react';
import type { BackgroundCategory } from '@/types';
import { renderHandoutHtml } from '@/lib/handout-renderer';
import { BACKGROUND_CONFIGS } from '@/lib/backgrounds';
import { BackgroundPicker } from '@/components/molecules/BackgroundPicker';
import { TagsInput } from '@/components/molecules/TagsInput';
import { ShareDialog } from '@/components/organisms/ShareDialog';
import { Button } from '@/components/atoms/button';
import { cn } from '@/lib/utils';

type SaveApiResponse = { id: string } | { error: string };
type PublishApiResponse = { shareToken: string } | { error: string };

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

  const renderedPreview = useMemo(() => renderHandoutHtml(markdownContent), [markdownContent]);

  const previewBackground = backgroundCategory
    ? BACKGROUND_CONFIGS[backgroundCategory].cssBackground
    : undefined;

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
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-bold text-white">New Handout</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Form column */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="handout-title" className="text-sm font-medium text-white/80">
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
                className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/30 outline-none focus:border-white/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/80">Background</span>
              <BackgroundPicker value={backgroundCategory} onChange={setBackgroundCategory} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="handout-markdown" className="text-sm font-medium text-white/80">
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
                className="w-full resize-y rounded-md border border-white/20 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-white/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-white/80">Tags</span>
              <TagsInput tags={tags} onChange={setTags} />
            </div>

            {saveError && <p className="text-sm text-red-400">{saveError}</p>}
            {publishError && <p className="text-sm text-red-400">{publishError}</p>}

            <div className="flex gap-3">
              <Button onClick={() => void handleSave()} disabled={isSaving || !!shareToken} className="flex-1">
                {isSaving ? 'Saving…' : handoutId ? 'Save changes' : 'Save draft'}
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleShare()}
                disabled={!handoutId || isSaving || isPublishing || !!shareToken}
                className={cn('flex-1', !handoutId && 'cursor-not-allowed opacity-50')}
              >
                {isPublishing ? 'Publishing…' : 'Share'}
              </Button>
            </div>

            {handoutId && !shareToken && <p className="text-xs text-white/40">Draft saved — click Share to publish.</p>}
            {shareToken && (
              <p className="text-xs text-green-400/70">
                Published —{' '}
                <button
                  className="underline hover:text-green-300"
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
            <span className="text-sm font-medium text-white/80">Preview</span>
            <div
              className="min-h-64 rounded-lg"
              style={{
                backgroundColor: '#1a1a2e',
                backgroundImage: previewBackground,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="rounded-lg bg-black/40 p-4 backdrop-blur-sm">
                {markdownContent ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderedPreview }}
                  />
                ) : (
                  <p className="text-sm text-white/30 italic">Your rendered markdown will appear here…</p>
                )}
              </div>
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
    </div>
  );
};

export default HandoutEditor;

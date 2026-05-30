# Potential Scalability Considerations

This document records architectural decisions made during implementation where a simpler solution was chosen for MVP, along with the alternatives considered for future scaling.

---

## Live Markdown Preview Rendering

**Location**: `src/components/handout/HandoutEditor.tsx`
**Decision date**: 2026-05-30

### Context

The `HandoutEditor` component renders a live preview of the GM's markdown content using `renderHandoutHtml` — a synchronous pipeline that runs remark → rehype → rehype-sanitize → stringify on every render.

React re-renders the component on every state change. Without memoization, the full pipeline fires on every keystroke in *any* field (title, tags), not just the markdown textarea.

### Decision — Option A: `useMemo`

```tsx
const renderedPreview = useMemo(
  () => renderHandoutHtml(markdownContent),
  [markdownContent]
);
```

The pipeline only re-runs when `markdownContent` changes. This eliminates unnecessary pipeline executions triggered by title/tags edits while keeping the preview synchronous and immediate on markdown input.

**Why chosen**: Zero new dependencies, built into React, one-line change. The plan notes that at typical handout lengths (< 5 000 chars) the pipeline completes in < 5 ms — well within frame budget. The `useMemo` cache hit cost is negligible.

### Option B: Debounce (not applied)

```tsx
const [debouncedContent, setDebouncedContent] = useState(markdownContent);

useEffect(() => {
  const timeout = setTimeout(() => setDebouncedContent(markdownContent), 300);
  return () => clearTimeout(timeout);
}, [markdownContent]);

const renderedPreview = renderHandoutHtml(debouncedContent);
```

**Trade-off**: Reduces pipeline frequency to at most once per 300 ms, further reducing CPU load at the cost of a visible 300 ms preview lag on every keystroke. Appropriate if the pipeline becomes noticeably slow at typical document sizes.

**When to apply**: If profiling shows the synchronous pipeline causing measurable lag (> 16 ms per frame) at the 5 000–10 000 char range that real GMs use.

### Option C: Web Worker (not applied)

Move the `renderHandoutHtml` call into a dedicated Web Worker, communicating via `postMessage`. The main thread posts the current `markdownContent` to the worker; the worker responds with rendered HTML asynchronously.

**Trade-off**: Eliminates all main-thread blocking regardless of document size. Adds significant complexity: a new worker file, serialisation overhead, an async update cycle, and worker lifecycle management. Preview updates become eventually-consistent rather than synchronous.

**When to apply**: If the document grows toward the 50 000 char limit and debouncing alone is insufficient. Also a candidate if the pipeline is extended with heavier plugins (e.g. syntax highlighting, LaTeX rendering).

---

## Future Considerations

| Area | Current state | Potential concern | Threshold to act |
|---|---|---|---|
| Markdown preview pipeline | `useMemo` | CPU spike at 50k chars | Profile at > 10k chars; add debounce if > 16 ms/frame |
| Handout list (S-02) | Not built | Full table scan for GMs with many handouts | Add cursor-based pagination when GM handout count exceeds 100 |
| Share link resolution | Single `.eq('share_token', token)` query | Index already in place | No action needed until query time > 100 ms at scale |
| Tag search/filtering | Not built | Full array-containment scan | Add GIN index on `tags` column when filter feature is added (S-02+) |

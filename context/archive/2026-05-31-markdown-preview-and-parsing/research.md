---
date: 2026-05-31T17:20:00+02:00
researcher: pterodactorius
git_commit: 93fc35de9c83ccad4c37cc8a8781b050655e8a6c
branch: feature/lesson-9
repository: ttrpg-handouts-generator
topic: 'Markdown preview and parsing libraries'
tags: [research, codebase, markdown, unified, remark, rehype, sanitization, preview, editor]
status: complete
last_updated: 2026-05-31
last_updated_by: pterodactorius
---

# Research: Markdown preview and parsing libraries

**Date**: 2026-05-31T17:20:00+02:00
**Researcher**: pterodactorius
**Git Commit**: 93fc35de9c83ccad4c37cc8a8781b050655e8a6c
**Branch**: feature/lesson-9
**Repository**: ttrpg-handouts-generator

## Research Question

How does the markdown preview and parsing work today (libraries, pipeline, security, styling, editor UX), and what library options exist for future enhancements?

## Summary

The app already has a **single, shared markdown rendering pipeline** built on `unified`
(`remark-parse` → `remark-gfm` → `remark-rehype` `{ allowDangerousHtml: false }` →
`rehype-sanitize` → `rehype-stringify`), exposed as one function `renderHandoutHtml(markdown)`
in `src/lib/handout-renderer.ts:16`. It is the **single XSS boundary** and is called from
two places: the React editor live preview (browser) and the Astro shared player page (Cloudflare
workerd SSR). The choice was deliberate: it is **pure ESM, DOM-free, and runs identically in
both runtimes** — DOM-based sanitizers (`sanitize-html`, `isomorphic-dompurify`) were rejected
because they fail on workerd.

Two notable findings worth acting on:

1. **The `prose` / `prose-invert` Tailwind classes are currently inert** — `@tailwindcss/typography`
   is **not installed**, so rendered markdown gets only browser-default element styling plus
   inherited color. This is the biggest low-effort, high-impact gap.
2. **No syntax highlighting** for fenced code blocks. If added, `rehype-highlight` (highlight.js)
   is the workerd-safe choice; `shiki` repeatedly fails on Workers (WASM load, bundle-size, and
   CPU-time limits per real-world reports).

Everything else (parsing, preview, sanitization) is solid and well-tested. Editor UX is a plain
`<textarea>` by explicit PRD decision (WYSIWYG is a Non-Goal for v1).

## Detailed Findings

### Parsing pipeline (current)

The entire pipeline is 14 lines, frozen as a module-level singleton:

```8:19:src/lib/handout-renderer.ts
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize)
  .use(rehypeStringify)
  .freeze();

const renderHandoutHtml = (markdown: string): string => {
  const result = processor.processSync(markdown);
  return String(result);
};
```

- **Libraries** (`package.json:34-42`): `unified@11`, `remark-parse@11`, `remark-gfm@4`,
  `remark-rehype@11`, `rehype-sanitize@6`, `rehype-stringify@10`. No `marked`, `markdown-it`,
  or `react-markdown` anywhere.
- **GFM support**: `remark-gfm` enables tables, strikethrough, task lists, autolinks. Tests
  assert table rendering (`src/lib/__tests__/handout-renderer.test.ts:50-56`).
- **`.freeze()`** is required by team rule — see `context/foundation/lessons.md:33-38`
  ("Freeze unified Processor Singletons"); it prevents accidental `.use()` mutation of the shared
  pipeline. Originated as finding F2 in the Phase 1 impl review.
- **`processSync` (not async `process`)** is deliberate: the preview fires on every keystroke and
  async would require stale-update management. Rationale quoted in
  `context/archive/2026-05-30-first-handout-creation-and-sharing/plan.md:57`.

### Preview rendering (editor + shared page)

Both consumers call the same `renderHandoutHtml` and inject the result as raw HTML.

- **Editor live preview** — `src/components/organisms/HandoutEditor.tsx:27` memoizes on markdown
  content only, then injects via `dangerouslySetInnerHTML`:

```196:199:src/components/organisms/HandoutEditor.tsx
                  <div
                    className="prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderedPreview }}
                  />
```

`useMemo` (`HandoutEditor.tsx:27`) ensures the pipeline only re-runs when `markdownContent`
changes, not on title/tags edits — documented as "Option A" in `docs/PotentialScalability.md:18-29`.

- **Shared player page** — `src/pages/share/[token].astro:49` renders server-side (workerd) and
  injects via Astro `set:html`:

```62:66:src/pages/share/[token].astro
          <div class="prose prose-invert max-w-none break-words">
            {/* renderHandoutHtml sanitizes via rehype-sanitize — the XSS boundary (see Phase 1 tests) */}
            {/* eslint-disable-next-line astro/no-set-html-directive */}
            <Fragment set:html={renderedHtml} />
          </div>
```

Note: HTML is **never stored** in the DB — only `markdown_content` is persisted (see
`publish.ts` and the share query at `share/[token].astro:26-31`); HTML is always rendered at
read time. This keeps the sanitize boundary authoritative.

### Sanitization / XSS boundary

- **Two layers of defense**: (1) `remarkRehype({ allowDangerousHtml: false })` drops raw HTML in
  the markdown source before it ever reaches the sanitizer; (2) `rehype-sanitize` with its
  **default schema** (mirrors GitHub) restricts link protocols to `http`/`https`/`mailto` and
  strips event-handler attributes.
- **No custom sanitize schema** is configured — default GitHub-mirror only. There is no documented
  plan to allow raw/custom HTML, iframes, or extended tags.
- **Test coverage** (`src/lib/__tests__/handout-renderer.test.ts:64-95`) asserts stripping of:
  `<script>`, `onerror=` attributes, `javascript:` hrefs, raw inline HTML (`<b>`), `style`
  injection, and `data:` URIs. The "strips raw inline HTML" test (line 81-84) confirms
  `allowDangerousHtml: false` behavior.
- **Single boundary invariant**: per `plan.md:85-86`, "nothing else is allowed to produce
  user-facing HTML from GM-supplied markdown." Both call sites carry comments pointing back to this.

### Output styling (prose/typography, backgrounds)

- **`@tailwindcss/typography` is NOT installed.** `package.json` has Tailwind 4
  (`tailwindcss@4`, `@tailwindcss/vite@4`) but no typography plugin, and `src/styles/global.css`
  only has `@import "tailwindcss";` + `@import "tw-animate-css";` with no `@plugin
"@tailwindcss/typography"`. **Therefore `prose`, `prose-invert`, `prose-sm` currently do
  nothing** — markdown elements get browser defaults + inherited color. This is the single most
  impactful, lowest-effort fix available.
- **Themed backgrounds** (`src/lib/backgrounds.ts:3-21`): three categories — `fantasy`
  (High Fantasy), `horror` (Grimdark), `scifi` (Post-Apocalyptic) — each a layered **CSS gradient**
  string (radial + linear), applied via inline `style`. These are explicitly placeholder gradients;
  real background art is parked (see Historical Context).
- **Readability overlay**: editor preview uses `bg-black/40 backdrop-blur-sm`
  (`HandoutEditor.tsx:194`); the share page uses a stronger frosted card `bg-black/55
backdrop-blur-md text-white` (`share/[token].astro:60`). Only the share page sets explicit
  `text-white` on the content container; the editor preview relies on inheritance.
- **No custom prose CSS** (`--tw-prose-*` vars, `.prose` overrides) exists in `global.css`.

### Editor UX (current)

- Plain monospace `<textarea>`, 50 000-char cap (`HandoutEditor.tsx:132-142`). No CodeMirror /
  rich editor.
- This is a deliberate PRD Non-Goal: `context/foundation/prd.md:136` — "WYSIWYG editor: Markdown-only
  for v1. WYSIWYG editors (rich text) require more complex state management and increase
  implementation time." Also recorded in `plan.md:40` and `roadmap.md:144`.

## Evaluation: library options for future enhancements

All recommendations respect the hard constraint that the **render pipeline must stay pure-ESM /
DOM-free / workerd-compatible** (the editor itself can be browser-only since it is a React island).

### 1. Make `prose` work — `@tailwindcss/typography` (highest ROI, lowest risk)

The classes are already in the markup. Installing the plugin and loading it in Tailwind 4 via CSS
makes them live:

```css
/* src/styles/global.css */
@import 'tailwindcss';
@plugin '@tailwindcss/typography';
```

Effort: ~1 line + install. Impact: immediate, correct heading/list/table/blockquote/code styling
on both preview and shared page. **Recommended first step.**

### 2. Syntax highlighting for fenced code — `rehype-highlight` (NOT `shiki`)

| Option                    | Engine                     | Workers-compatible? | Notes                                                                                                                                                                              |
| ------------------------- | -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`rehype-highlight`**    | highlight.js (lowlight)    | ✅ Yes              | Pure JS, ~1 MB, drop-in `.use(rehypeHighlight)` before `rehypeStringify`. Real-world report: deployed cleanly on Workers. **Recommended.**                                         |
| `@shikijs/rehype` (shiki) | Oniguruma WASM / JS engine | ⚠️ Problematic      | Default WASM load fails on workerd; JS-engine + fine-grained bundle still hits bundle-size and CPU-time limits per multiple field reports. Async-only (would break `processSync`). |
| `starry-night`            | TextMate + WASM            | ⚠️ WASM             | Same WASM-on-Workers class of problems.                                                                                                                                            |

Caveat: `rehype-highlight` runs synchronously and integrates with `processSync`. It also requires
the sanitize schema to permit highlight.js class names — `rehype-sanitize`'s default GitHub schema
allows `className` on `code`/`span`, so this generally works, but verify against the XSS tests.

### 3. Live-preview performance (only if needed)

Current `useMemo` approach is fine at typical sizes (<5k chars, <5 ms). Documented escalation path
in `docs/PotentialScalability.md:31-54`: Option B = 300 ms debounce; Option C = Web Worker. Only act
if profiling shows >16 ms/frame at 5k–10k chars, or if a heavy plugin (syntax highlighting/LaTeX)
is added. A Web Worker becomes more attractive after adding highlight.js.

### 4. Richer editor (deferred — PRD Non-Goal, but options if revisited)

All are browser-only React-island concerns; none change the SSR render pipeline:

- **CodeMirror 6** — raw-markdown source editing with syntax highlighting, line numbers; framework-
  agnostic, MIT, incremental parsing. Best fit if staying "markdown source" but want a better editor.
- **Milkdown / Crepe** (ProseMirror + remark) — true WYSIWYG, AST-backed, Notion-like. Moderate
  bundle, client-side setup required. Best fit if the WYSIWYG Non-Goal is ever lifted.
- **MDXEditor** (Lexical) — full WYSIWYG with built-in UI, heavier footprint.
- **`@uiw/react-md-editor`** — lightweight split-pane (textarea + preview); least invasive upgrade.

If a richer editor is adopted, keep `renderHandoutHtml` as the canonical sanitize/render path for
the **shared page** regardless of what the editor uses for its in-editor preview, to preserve the
single XSS boundary.

## Code References

- `src/lib/handout-renderer.ts:8-19` — the entire pipeline + `renderHandoutHtml` export
- `src/lib/__tests__/handout-renderer.test.ts:1-113` — GFM + XSS + edge-case coverage
- `src/components/organisms/HandoutEditor.tsx:27` — `useMemo` preview render
- `src/components/organisms/HandoutEditor.tsx:196-199` — preview injection (`dangerouslySetInnerHTML`)
- `src/components/organisms/HandoutEditor.tsx:132-142` — markdown textarea (50k cap)
- `src/pages/share/[token].astro:49` — SSR render call
- `src/pages/share/[token].astro:62-66` — shared-page injection (`set:html`) + boundary comment
- `src/pages/api/handouts/[id]/publish.ts` — publish flow (stores markdown, not HTML)
- `src/lib/backgrounds.ts:3-21` — `BACKGROUND_CONFIGS` (3 gradient themes)
- `src/styles/global.css:1-2` — Tailwind entry (no typography `@plugin`)
- `package.json:34-42` — markdown dependency set

## Architecture Insights

- **Single shared render module = single XSS boundary.** The same `renderHandoutHtml` runs in the
  browser island and the workerd SSR page. This is the central architectural decision and the
  reason the library choice was constrained to pure-ESM/DOM-free.
- **Render at read time, never store HTML.** Only markdown is persisted; HTML is derived on every
  read, so the sanitizer can never be bypassed by stale stored output.
- **Frozen singleton processor.** Codified as a reusable lesson; any new `unified()` pipeline in the
  repo should `.freeze()`.
- **Defense in depth on sanitization.** `allowDangerousHtml: false` + `rehype-sanitize` are two
  independent layers, both covered by tests.

## Historical Context (from prior changes)

- `context/archive/2026-05-30-first-handout-creation-and-sharing/plan.md:15` — DOM-based sanitizers
  (`sanitize-html`, `isomorphic-dompurify`) rejected because they fail on Cloudflare workerd;
  unified/remark/rehype chosen as "the only viable choice that runs identically in the browser
  (live preview) and on the server (player page)."
- `.../plan-brief.md:21-22,58` — decision table: live preview via `processSync`; shared module is
  the single XSS boundary; "No HTML ever comes from the DB."
- `.../plan.md:57` — synchronous pipeline mandated for keystroke-level preview.
- `.../reviews/impl-review-phase-1.md` (F2) → `context/foundation/lessons.md:33-38` — `.freeze()` rule.
- `.../reviews/impl-review-phase-2.md` (F2) → `docs/PotentialScalability.md:18-54` — `useMemo` chosen;
  debounce / Web Worker deferred.
- `context/foundation/prd.md:79-80,136` — markdown (not WYSIWYG) for v1; XSS-safety guardrail (`prd.md:54`).
- **Parked / deferred markdown items**: WYSIWYG editor (`prd.md:136`, `roadmap.md:144`), syntax
  highlighting + LaTeX (`docs/PotentialScalability.md:54`), preview debounce/Web Worker, real
  background art (gradients are placeholders), custom/raw HTML (disabled by design).

Note: `docs/PotentialScalability.md:9` references a stale path
`src/components/handout/HandoutEditor.tsx`; the actual file is
`src/components/organisms/HandoutEditor.tsx`.

## Related Research

- No prior `research.md` existed under `context/`. The S-01 rationale lives inline in
  `context/archive/2026-05-30-first-handout-creation-and-sharing/plan.md` and `plan-brief.md`
  (there is no standalone research artifact for that change).

## Open Questions

- Should the shared player page eventually use real background images (PRD parks custom upload;
  three built-in gradients are placeholders) — affects styling/readability decisions for prose.
- If syntax highlighting is added via `rehype-highlight`, confirm the default `rehype-sanitize`
  schema preserves the emitted `className`s without weakening the XSS tests, and decide whether the
  Web Worker path (`PotentialScalability.md` Option C) is warranted by the added CPU cost.
- Is the WYSIWYG Non-Goal firm for v2, or worth revisiting with Milkdown given its remark/AST
  alignment with the existing pipeline?

# Markdown Typography & Syntax Highlighting Implementation Plan

## Overview

Two enhancements to the existing markdown rendering pipeline: (1) install and wire
`@tailwindcss/typography` so the already-present `prose`/`prose-invert` classes actually style
rendered markdown, and (2) add fenced-code syntax highlighting via `rehype-highlight` (highlight.js),
the only Cloudflare-workerd-safe and synchronous option. Both changes are low-risk and build on the
single shared render module without touching the data model, API, or auth.

## Current State Analysis

- The markdown pipeline is a single frozen `unified()` singleton — `remark-parse` → `remark-gfm`
  → `remark-rehype` `{ allowDangerousHtml: false }` → `rehype-sanitize` → `rehype-stringify` —
  exposed as `renderHandoutHtml(markdown)` at `src/lib/handout-renderer.ts:8-19`. It is the single
  XSS boundary, called from both the React editor preview (browser) and the Astro shared page
  (workerd SSR).
- `@tailwindcss/typography` is **not installed**. `src/styles/global.css:1-2` loads only
  `@import "tailwindcss";` and `@import "tw-animate-css";`. Therefore the `prose prose-invert
prose-sm` classes at `src/components/organisms/HandoutEditor.tsx:197` and the `prose prose-invert`
  classes at `src/pages/share/[token].astro:62` currently style nothing — markdown gets browser
  defaults plus inherited color.
- `global.css` is imported once via `src/layouts/Layout.astro:2`; both the share page and the editor
  page render through `Layout`, so anything loaded in `global.css` applies to both render sites.
- No syntax highlighting exists for fenced code blocks. Research (`research.md`) established
  `rehype-highlight`/highlight.js as the workerd-safe choice; `shiki` fails on Workers (WASM load,
  bundle size, CPU-time limits).
- Existing tests at `src/lib/__tests__/handout-renderer.test.ts` cover GFM rendering and the XSS
  boundary (script tags, `onerror`, `javascript:`/`data:` URIs, raw HTML stripping).

## Desired End State

- Rendered markdown on both the editor preview and the shared player page shows full typographic
  styling (headings, lists, tables, blockquotes, inline/fenced code) via the typography plugin's
  dark (`prose-invert`) variant, legible over the themed gradient backgrounds.
- Fenced code blocks with a language hint (e.g. ` ```js `) render highlight.js token markup
  styled by an imported dark hljs theme.
- The XSS boundary is unchanged in strength — all existing security tests still pass.
- `npm run lint`, `npm run build`, and `npm run test` all pass.

### Key Discoveries:

- Pipeline + XSS boundary: `src/lib/handout-renderer.ts:8-19`
- Tailwind 4 plugins load via `@plugin` in CSS, alongside the existing `@import "tw-animate-css";`
  (`src/styles/global.css:1-2`)
- Single CSS entrypoint: `src/layouts/Layout.astro:2` (`import '../styles/global.css'`)
- Render sites: `src/components/organisms/HandoutEditor.tsx:196-199` (`dangerouslySetInnerHTML`),
  `src/pages/share/[token].astro:62-66` (`set:html`)
- Frozen-singleton rule: `context/foundation/lessons.md:33-38` — the edited pipeline must remain
  `.freeze()`d.

## What We're NOT Doing

- No WYSIWYG or richer editor (CodeMirror/Milkdown) — PRD Non-Goal; the plain textarea stays.
- No custom `rehype-sanitize` schema and no change to the sanitizer's strength (highlight runs after
  sanitize precisely so the schema is untouched).
- No LaTeX/math rendering.
- No live-preview performance changes (debounce / Web Worker) — current `useMemo` is sufficient at
  documented sizes; revisit only if profiling shows lag.
- No per-theme custom `--tw-prose-*` tuning — rely on `prose-invert` plus existing blur overlays.
- No real background art (gradients remain placeholders).

## Implementation Approach

Phase 1 is a pure styling enablement (dependency + one CSS line + verification). Phase 2 extends the
render pipeline by appending `rehype-highlight` **after** `rehype-sanitize`: because the sanitizer
has already escaped the code text, the highlighter only wraps already-safe text in `<span>`s, so the
XSS boundary needs no schema changes and the hljs spans pass straight to `rehype-stringify`. A dark
highlight.js theme stylesheet is imported in `global.css` to color the tokens. Tests are extended to
lock the highlight output and re-assert the security boundary held after reordering.

## Critical Implementation Details

- **Highlight must run after sanitize.** Appending `.use(rehypeHighlight)` after `.use(rehypeSanitize)`
  (and before `.use(rehypeStringify)`) keeps the sanitizer authoritative on raw input while letting
  highlight.js add class-only `<span>` markup to escaped code. Reversing this order would require the
  sanitize schema to allowlist hljs class names. The processor must stay `.freeze()`d at the end of
  the chain (`context/foundation/lessons.md:33-38`).
- **Dynamic-content styling is not Tailwind-utility-scanned.** The `prose` element styles (typography
  plugin) and `hljs-*` token styles (imported theme CSS) apply via element/class selectors, so they
  style the runtime-generated markdown HTML correctly without appearing in any scanned source file.
- **`prose` and the hljs theme both style `pre`/`code`.** The typography plugin sets a background and
  padding on `prose pre`, while the hljs theme sets a `.hljs` background on the nested `<code>`. These
  can stack into a doubled panel; verify the interaction (manual check 2.8) and reset the `prose pre`
  background only if it visibly clashes — the single sanctioned exception to "zero custom prose CSS".

## Phase 1: Enable Tailwind Typography

### Overview

Install `@tailwindcss/typography` and load it so the existing `prose` classes style rendered markdown
on both render sites.

### Changes Required:

#### 1. Dependency

**File**: `package.json`

**Intent**: Add `@tailwindcss/typography` as a dependency so the `prose` utilities exist.

**Contract**: New entry in `dependencies` (install via `npm install -D @tailwindcss/typography` or
`dependencies` — either is acceptable; it is a build-time/style plugin). Version resolved by npm.

#### 2. Plugin registration

**File**: `src/styles/global.css`

**Intent**: Register the typography plugin in the Tailwind 4 CSS-first config so `prose`/`prose-invert`
generate styles.

**Contract**: Add `@plugin "@tailwindcss/typography";` near the top alongside the existing
`@import "tailwindcss";` / `@import "tw-animate-css";` lines.

### Success Criteria:

#### Automated Verification:

- Linting passes: `npm run lint`
- Production build succeeds: `npm run build`
- Existing renderer tests still pass: `npm run test`

#### Manual Verification:

- On the handout editor page, typing markdown (headings, lists, a table, blockquote, inline code)
  shows styled prose in the preview pane, legible over each of the three background gradients.
- On a shared handout page (`/share/<token>`), the same markdown renders with full prose styling and
  the title remains visually distinct from body content.
- Text remains legible over the `bg-black/40`–`bg-black/55` blur overlays on both sites.

**Implementation Note**: After completing this phase and all automated verification passes, pause for
manual confirmation before proceeding to Phase 2.

---

## Phase 2: Add Syntax Highlighting

### Overview

Append `rehype-highlight` to the render pipeline after the sanitizer and style its output with an
imported dark highlight.js theme; extend tests.

### Changes Required:

#### 1. Dependency

**File**: `package.json`

**Intent**: Add `rehype-highlight` (brings highlight.js/lowlight) for synchronous, workerd-safe code
highlighting.

**Contract**: New entry in `dependencies`; version resolved by npm. (`highlight.js` ships with the
theme CSS used below.)

#### 2. Pipeline extension

**File**: `src/lib/handout-renderer.ts`

**Intent**: Highlight fenced code blocks without weakening the XSS boundary by running highlight after
sanitize.

**Contract**: Insert `.use(rehypeHighlight)` between `.use(rehypeSanitize)` and
`.use(rehypeStringify)`; keep the trailing `.freeze()`. No other call-site changes — the function
signature `renderHandoutHtml(markdown: string): string` is unchanged.

#### 3. Token theme stylesheet

**File**: `src/styles/global.css`

**Intent**: Provide token colors for the `hljs-*` classes that highlight.js emits, in a dark theme
that reads well on the gradient backgrounds.

**Contract**: Add a CSS import for one highlight.js dark theme (e.g.
`@import "highlight.js/styles/github-dark.css";`). Resolved by Vite from `node_modules`. Final theme
choice is the implementer's call among hljs dark themes; default to `github-dark`.

#### 4. Tests

**File**: `src/lib/__tests__/handout-renderer.test.ts`

**Intent**: Lock the new highlight behavior and re-assert the security boundary survived the pipeline
reorder.

**Contract**: Add a case asserting a fenced code block with a language hint (e.g. a ` ```js `
block) produces highlight.js markup (`class="hljs..."` / `hljs-` span classes) in the output; keep
all existing XSS assertions green. **Loosen the existing `renders fenced code blocks` assertion**
(`src/lib/__tests__/handout-renderer.test.ts:43-48`) to substring-safe checks — `rehype-highlight`
rewrites `pre > code` to `<code class="hljs …">`, so the current exact `toContain('<code>')` /
`toContain('<pre>')` assertions will go red. Change them to tolerant forms (`toContain('<pre')`,
`toContain('<code')`, and assert the literal code text `const x = 1;` survives), and add a case
asserting an **un-hinted** fenced block renders without `hljs-` token spans (it should pass through
as a readable block, matching manual check 2.6). Existing XSS test names are unchanged.

### Success Criteria:

#### Automated Verification:

- New + existing tests pass: `npm run test`
- XSS test cases (`<script>`, `onerror`, `javascript:`, `data:`, raw HTML) still pass unchanged
- Linting passes: `npm run lint`
- Production build succeeds (confirms `rehype-highlight` + theme CSS bundle through `@astrojs/cloudflare`): `npm run build`

#### Manual Verification:

- A fenced code block with a language (e.g. ` ```js `) shows colored token highlighting in both
  the editor preview and the shared page.
- A fenced code block without a language hint still renders as a readable monospaced block (no error).
- Code-block colors are legible over all three themed backgrounds.
- The `prose`-styled `pre` and the imported hljs `.hljs` background do not visibly clash (no doubled
  or mismatched panel). If they do, reset the `prose pre` / `pre code` background so the hljs theme
  owns the code surface — this is the only sanctioned exception to the "zero custom prose CSS" decision.

**Implementation Note**: After automated verification passes, pause for manual confirmation.

---

## Testing Strategy

### Unit Tests:

- Highlight markup present for language-tagged fenced code blocks.
- All existing GFM rendering assertions remain green.
- All existing XSS-stripping assertions remain green after the pipeline reorder (the core safety net).

### Integration Tests:

- None added; the renderer is exercised end-to-end through the editor preview and the shared page
  (manual verification).

### Manual Testing Steps:

1. Open the handout editor; type a sample with headings, a list, a table, a blockquote, inline code,
   and a ` ```js ` fenced block; confirm prose + highlighting render over each background.
2. Save + publish; open `/share/<token>`; confirm identical rendering on the player page.
3. Paste a known XSS attempt (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`) and confirm
   it is stripped in both preview and shared output.

## Performance Considerations

`rehype-highlight` is synchronous and CPU-bound, adding modest cost per render. At documented handout
sizes (<5k chars) this stays well within budget and preserves `processSync`. If large documents with
many code blocks ever cause preview lag, the deferred debounce / Web Worker options in
`docs/PotentialScalability.md:31-54` are the escalation path — out of scope here.

`rehype-highlight` registers lowlight's `common` language set (~35 languages) by default. The Phase 2
`npm run build` check is the fail-fast gate for `@astrojs/cloudflare` bundle limits. If that gate
trips on Workers size limits, the remediation is to constrain the registered languages via
rehype-highlight's `languages` / `subset` option (e.g. register only the handful TTRPG handouts
realistically use) rather than the full common set.

## Migration Notes

No data migration. HTML is rendered at read time from stored markdown, so existing handouts gain
typography and highlighting automatically with no backfill.

## Implementation Addenda

- **Phase 1 (ea74957)** also fixed an unplanned, user-reported React warning in the editor preview:
  `src/components/organisms/HandoutEditor.tsx` mixed the `background` shorthand with
  `backgroundSize`/`backgroundPosition` longhands, causing a re-render styling conflict. Replaced with
  `backgroundColor` + `backgroundImage` longhands (fallback color preserved). Out of the original plan
  scope but landed alongside the typography work since the same file/area was in play.

## References

- Related research: `context/changes/markdown-preview-and-parsing/research.md`
- Pipeline + XSS boundary: `src/lib/handout-renderer.ts:8-19`
- Tests: `src/lib/__tests__/handout-renderer.test.ts`
- CSS entrypoint: `src/styles/global.css:1-2`, loaded via `src/layouts/Layout.astro:2`
- Render sites: `src/components/organisms/HandoutEditor.tsx:196-199`, `src/pages/share/[token].astro:62-66`
- Frozen-singleton rule: `context/foundation/lessons.md:33-38`
- Deferred perf options: `docs/PotentialScalability.md:31-54`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Enable Tailwind Typography

#### Automated

- [x] 1.1 Linting passes: `npm run lint` — ea74957
- [x] 1.2 Production build succeeds: `npm run build` — ea74957
- [x] 1.3 Existing renderer tests still pass: `npm run test` — ea74957

#### Manual

- [x] 1.4 Editor preview shows styled prose over each background gradient — ea74957
- [x] 1.5 Shared page renders full prose styling with distinct title — ea74957
- [x] 1.6 Text legible over blur overlays on both sites — ea74957

### Phase 2: Add Syntax Highlighting

#### Automated

- [x] 2.1 New + existing tests pass: `npm run test` — 51d4725
- [x] 2.2 XSS test cases still pass unchanged — 51d4725
- [x] 2.3 Linting passes: `npm run lint` — 51d4725
- [x] 2.4 Production build succeeds: `npm run build` — 51d4725

#### Manual

- [x] 2.5 Language-tagged fenced block shows colored highlighting in preview + shared page — 51d4725
- [x] 2.6 Fenced block without language hint renders as readable monospaced block — 51d4725
- [x] 2.7 Code-block colors legible over all three themed backgrounds — 51d4725
- [x] 2.8 `prose` `pre` and hljs `.hljs` backgrounds do not clash (reset `prose pre` if needed) — 51d4725

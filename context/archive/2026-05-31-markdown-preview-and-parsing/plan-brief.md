# Markdown Typography & Syntax Highlighting — Plan Brief

> Full plan: `context/changes/markdown-preview-and-parsing/plan.md`
> Research: `context/changes/markdown-preview-and-parsing/research.md`

## What & Why

The app's rendered markdown is currently unstyled (`prose` classes are inert because the typography
plugin isn't installed) and has no code highlighting. This plan installs `@tailwindcss/typography`
to make `prose` live and adds workerd-safe syntax highlighting via `rehype-highlight`, so handouts
look polished in both the editor preview and the shared player page.

## Starting Point

A single frozen `unified()` pipeline (`src/lib/handout-renderer.ts:8-19`) renders markdown for both
render sites and is the sole XSS boundary. `prose`/`prose-invert` classes are already in the markup
but do nothing — `@tailwindcss/typography` is missing from `global.css`. No fenced-code highlighting
exists.

## Desired End State

Rendered markdown shows full typographic styling (headings, lists, tables, quotes, code) in the
dark `prose-invert` variant, legible over the themed gradients, with language-tagged code blocks
highlighted by a dark highlight.js theme — and the XSS boundary unchanged.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Render library | Keep existing unified/remark/rehype | Pure-ESM, DOM-free, workerd-safe; already the XSS boundary | Research |
| Syntax highlighter | `rehype-highlight` (not shiki) | Only Workers-safe + synchronous option; shiki fails on WASM/bundle/CPU | Research |
| Highlight vs sanitize order | Highlight **after** sanitize | Keeps sanitizer authoritative; no schema edits; hljs spans pass through | Plan |
| Token colors | Import a dark hljs theme CSS (github-dark) | Battle-tested colors via one import; reads on dark gradients | Plan |
| Prose legibility | Rely on `prose-invert` + existing blur overlays | Zero custom CSS; consistent with current overlay design | Plan |
| Test coverage | Highlight output + re-assert XSS tests | Locks new behavior and guards the security boundary | Plan |

## Scope

**In scope:**
- Install + register `@tailwindcss/typography` via `@plugin` in `global.css`
- Append `rehype-highlight` after `rehype-sanitize` in the pipeline (keep `.freeze()`)
- Import a dark highlight.js theme stylesheet
- Extend renderer tests (highlight output + XSS re-assertion)

**Out of scope:**
- WYSIWYG / richer editor (PRD Non-Goal)
- Custom sanitize schema or any weakening of the XSS boundary
- LaTeX/math, live-preview perf changes, per-theme prose tuning, real background art

## Architecture / Approach

Two small, sequential phases on the existing single render module. Phase 1 is styling enablement
(dependency + one `@plugin` line). Phase 2 extends the frozen pipeline by inserting
`rehype-highlight` after the sanitizer — the highlighter only wraps already-escaped code text in
class-only spans, so the sanitize schema is untouched — and imports a dark hljs theme into the single
CSS entrypoint (`global.css`, loaded via `Layout.astro`, applied to both render sites).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Typography plugin | `prose` actually styles rendered markdown | Plugin not loading in Tailwind 4 CSS-first config |
| 2. Syntax highlighting | Highlighted fenced code + theme colors | hljs theme CSS bundling through `@astrojs/cloudflare` |

**Prerequisites:** None — builds on the shipped S-01 pipeline.
**Estimated effort:** ~1 session, 2 phases.

## Open Risks & Assumptions

- Assumes the editor page renders through `Layout` (so `global.css` applies); confirm during Phase 1
  manual verification.
- Assumes `highlight.js/styles/*.css` resolves via Vite in the Cloudflare build — the Phase 2
  `npm run build` check is the fail-fast gate.
- Assumes default `rehype-highlight` behavior (highlight on language hint) is acceptable; un-hinted
  blocks render as plain monospaced code.

## Success Criteria (Summary)

- Rendered markdown is fully styled on both editor preview and shared page, legible over all three
  backgrounds.
- Language-tagged code blocks are highlighted; un-hinted blocks still render cleanly.
- All existing XSS tests pass unchanged; lint, build, and tests are green.

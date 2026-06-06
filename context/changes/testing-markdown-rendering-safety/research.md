---
date: 2026-06-06T11:34:00+02:00
researcher: AI agent
git_commit: 73652affb456284d4fec6b45db1ec4588f306b5c
branch: feature/lesson-11
repository: ttrpg-handouts-generator
topic: "Ground rollout Phase 3 — markdown rendering safety (Risk #3)"
tags: [research, codebase, markdown, unified, rehype, rehype-sanitize, xss, rendering, handout-renderer]
status: complete
last_updated: 2026-06-06
last_updated_by: AI agent
---

# Research: Markdown rendering safety (test-plan Phase 3, Risk #3)

**Date**: 2026-06-06T11:34:00+02:00
**Researcher**: AI agent
**Git Commit**: 73652affb456284d4fec6b45db1ec4588f306b5c
**Branch**: feature/lesson-11
**Repository**: ttrpg-handouts-generator

## Research Question

Ground rollout Phase 3 of `context/foundation/test-plan.md` (Risk #3: malicious markdown renders an
executable script / XSS in the preview or shared read-only page). Verify the rehype-sanitize wiring,
confirm or correct the response guidance, locate existing tests, identify the cheapest useful test
layer, and flag speculative risks or misleading evidence.

## Summary

**The core of Phase 3 is already shipped.** `src/lib/__tests__/handout-renderer.test.ts` (lines 78–109)
has a `describe('XSS payload stripping')` block covering `<script>`, `onerror=`, `javascript:` hrefs,
raw inline HTML (`<b>`), `style` with `javascript:`, and `data:` URIs — exactly the vectors the test
plan identified. The renderer is a single frozen `unified()` pipeline with two independent defensive
layers: `allowDangerousHtml: false` at the markdown-to-HTML conversion step and `rehype-sanitize`
(default GitHub-mirror schema) for HTML normalisation.

Both rendering surfaces (GM preview and anonymous share page) route through the same
`renderHandoutHtml` function. HTML is never stored in the DB — it is derived at read time — so the
sanitizer cannot be bypassed by stale stored output. Preview/shared parity is an architectural
guarantee, not a property that needs its own test.

What remains for Phase 3 is a **targeted gap-filling** of the existing XSS describe block: protocol
bypass variants that are common in the wild but not yet asserted, an SVG vector, and a pipeline-order
contract test. This is an additive unit test pass — no new harness, no new helpers, no new file if the
additions fit naturally alongside the existing XSS tests.

---

## Detailed Findings

### 1. The rendering pipeline (`src/lib/handout-renderer.ts`)

Full pipeline, 24 lines, frozen singleton:

```
src/lib/handout-renderer.ts:1–24
```

Step order (exact):

| Step | Plugin | Option |
|------|--------|--------|
| 1 | `remarkParse` | — |
| 2 | `remarkGfm` | — |
| 3 | `remarkRehype` | `{ allowDangerousHtml: false }` |
| 4 | `rehypeSanitize` | no custom schema (default GitHub-mirror) |
| 5 | `rehypeHighlight` | — |
| 6 | `rehypeStringify` | — |

`.freeze()` is called at line 16, satisfying `context/foundation/lessons.md:33–38`.

**Two independent defensive layers:**

1. **`allowDangerousHtml: false` (step 3)** — raw HTML embedded in markdown is discarded before the
   sanitizer ever sees it. This is why `<b>bold</b>` typed directly into the markdown textarea
   produces no `<b>` tag in the output, even without sanitize. `handout-renderer.test.ts:95–98`
   already asserts this.

2. **`rehype-sanitize` (step 4)** — restricts the HAST tree to the default GitHub-mirror allowlist.
   Permitted protocols for `href` attributes: `http`, `https`, `mailto`. Event-handler attributes
   (`onclick`, `onerror`, etc.) are not in the schema and are dropped.

**Critical pipeline-order observation:** `rehypeHighlight` (step 5) runs **after** `rehypeSanitize`
(step 4). If highlight.js were to inject content containing executable attributes, it would bypass
sanitize. In practice highlight.js only wraps token text in `<span class="hljs-*">` elements — it
never introduces new `href`, `src`, or event-handler attributes. The existing GFM + XSS tests pass
with both plugins active, confirming the order is safe. But the order is not currently documented as
a contract; any future plugin added after `rehypeHighlight` in the pipeline would inherit the same
bypass risk.

### 2. Sanitisation schema detail

`rehypeSanitize` is called with **no second argument** (line 13). This activates the default schema
from `hast-util-sanitize`, which:

- Allows a curated list of block and inline elements (`p`, `a`, `ul`, `ol`, `li`, `h1`–`h6`,
  `blockquote`, `pre`, `code`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `strong`, `em`, `del`,
  `img`, `hr`, `br`, and a handful of others).
- Disallows `<svg>`, `<math>`, `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>`.
- Allows `className` on `code` and `span` (needed for highlight.js markup).
- Allows `href` on `<a>` with a protocol allowlist: `http`, `https`, `mailto`.
- Allows `src` on `<img>` with no protocol restriction — this is the one attribute that could be
  abused via `javascript:` or `data:` URIs on images if sanitize were misconfigured. The default
  schema does allow `src` on `<img>`, but the browser itself does not execute `javascript:` src on
  images; it is harmless for content injection but could be used for tracking.
- Does NOT allow event-handler attributes (`on*`).

**No custom configuration is present.** There is no plan to allow raw/custom HTML, iframes, or
extended schema.

### 3. Rendering surfaces — parity is architecturally guaranteed

Both consumers call the same `renderHandoutHtml` and inject the returned string as raw HTML:

| Surface | File | Render call | Injection |
|---------|------|-------------|-----------|
| GM preview | `src/components/organisms/HandoutEditor.tsx:68` | `useMemo(() => renderHandoutHtml(markdownContent), ...)` | `dangerouslySetInnerHTML={{ __html: renderedPreview }}` (line 250) |
| Share page | `src/pages/share/[token].astro:49` | `renderHandoutHtml(handout.markdown_content)` | `<Fragment set:html={renderedHtml} />` (line 65) |

There is no second renderer. `renderHandoutHtml` is the only function that produces HTML from
markdown anywhere in the codebase. HTML is never persisted — only `markdown_content` is stored; the
HTML is derived at read time on every request/render. This means:
- Sanitize cannot be bypassed by stale stored output.
- Changing the pipeline (e.g. adding a new plugin) takes effect for all handouts immediately.

The share page carries a comment at lines 63–64 explicitly calling out this XSS boundary.

**Implication for Phase 3:** preview/shared parity does NOT need its own test. Any test of
`renderHandoutHtml` covers both surfaces by definition. Adding component-level XSS tests to
`HandoutEditor.test.tsx` would be testing the renderer through the component, which adds test
complexity without adding coverage signal — this is the "implementation mirror" anti-pattern to avoid.

### 4. Existing XSS test coverage

`src/lib/__tests__/handout-renderer.test.ts`, lines 78–109:

| Test | Adversarial input | Assertion |
|------|-------------------|-----------|
| strips script tags | `<script>alert(1)</script>` | `not.toContain('<script>')`, `not.toContain('alert(1)')` |
| strips onerror attributes | `<img src=x onerror=alert(1)>` | `not.toContain('onerror')` |
| strips javascript: href | `[click](javascript:alert(1))` | `not.toContain('javascript:')` |
| strips raw inline HTML | `<b>bold</b>` | `not.toContain('<b>bold</b>')` |
| strips style with javascript: | `<p style="background:url(javascript:alert(1))">` | `not.toContain('javascript:')` |
| strips data: URI | `[click](data:text/html,<script>alert(1)</script>)` | `not.toContain('data:')` |

**This directly satisfies the Phase 3 goal as stated in the test plan.** The "proof" is already there
for the three canonical XSS categories: `<script>`, `onerror`, `javascript:`.

### 5. What is genuinely missing — gap analysis

The existing coverage is correct and non-trivial. However, protocol-handling bypass variants that
are common in sanitizer bypass writeups are not yet tested:

**Gap A — Case-insensitive protocol variants**
- `JAVASCRIPT:alert(1)` and `Javascript:alert(1)` — some sanitizers normalise to lowercase before
  checking, others do not. rehype-sanitize's protocol allowlist comparison is case-sensitive against
  the parsed protocol; WHATWG URL parsing lowercases the scheme before rehype sees it, so this is
  likely already handled, but not asserted.

**Gap B — Whitespace-prefixed or newline-embedded protocols**
- `[click]( javascript:alert(1))` (leading space before scheme)
- `[click](java&#x0A;script:alert(1))` (newline-encoded in URL)
  Some older parsers skip whitespace before the scheme. Markdown parsers may behave differently from
  HTML parsers here. Not tested.

**Gap C — SVG vector**
- `<svg onload=alert(1)>` or `<svg><script>alert(1)</script></svg>` — SVG is not in the default
  sanitize allowlist so the outer `<svg>` tag is stripped, but the content handling under
  `allowDangerousHtml: false` + the MDAST stripping should already prevent this. Not tested.

**Gap D — Pipeline order regression guard**
- No test verifies that syntax-highlighted output (which passes through `rehypeHighlight` AFTER
  `rehypeSanitize`) does not re-introduce a dangerous attribute. A single test that feeds a
  language-tagged fenced block containing an injected payload into the renderer and asserts clean
  output would lock this contract.

**Gap E — GFM autolink protocol**
- remark-gfm enables bare-URL autolinks (`https://example.com` → `<a href="...">`. A bare
  `javascript:alert(1)` is not a valid autolink per GFM spec (scheme must be followed by `//` or
  be an email), so this is likely safe by specification. Not yet tested.

**Not a gap:**
- `<img src="javascript:...">` — style and event handlers are dropped; `src` with `javascript:`
  on an image is browser-harmless (images cannot execute scripts) and is already partially covered
  by the style test.
- Component-level XSS test in `HandoutEditor.test.tsx` — not a gap; the renderer is the boundary,
  not the component.

### 6. Cheapest test layer

**Unit tests against `renderHandoutHtml` in the existing `handout-renderer.test.ts`** — no new
harness, no Supabase, no browser. All gaps A–D can be expressed as 4–5 new `it()` cases appended to
the existing `describe('XSS payload stripping')` block. This satisfies the "cheapest test that gives
real signal" principle from the test plan.

An integration or e2e test would not add signal for the sanitization concern: the DB is not involved
(HTML is never stored), and both render surfaces call the same function. The signal is entirely in the
unit layer.

### 7. Response guidance corrections

| Guidance item | Plan says | Research verdict |
|---------------|-----------|-----------------|
| "rehype-sanitize is installed" does not mean it is wired | Challenge to verify | **Verified wired.** `handout-renderer.ts:13`, no bypass, two independent layers. Correction: the challenge should be reframed — the real open question is _completeness_ of the bypass variant coverage, not whether sanitize is wired. |
| "cannot be bypassed via raw HTML or link protocols" | Challenge to verify | `allowDangerousHtml: false` drops raw HTML before sanitize. Default schema allowlists `http`/`https`/`mailto` for `href`. The bypass variants (gaps A–C) are not yet tested and are the actual remaining risk. |
| Preview vs shared parity | Must prove | **Architecturally guaranteed** by single renderer. Not a separate test concern. |
| Avoid snapshotting rendered HTML | Anti-pattern | Existing tests use `toContain`/`not.toContain`, not snapshots. ✓ |
| Avoid asserting benign markdown only | Anti-pattern | Already avoided — XSS block exists with adversarial inputs. ✓ |
| Likely cheapest layer: unit (pure renderer) | Hypothesis | **Confirmed.** |

---

## Code References

- `src/lib/handout-renderer.ts:1–24` — full pipeline, imports, freeze, export
- `src/lib/handout-renderer.ts:12` — `remarkRehype, { allowDangerousHtml: false }` — first defensive layer
- `src/lib/handout-renderer.ts:13` — `.use(rehypeSanitize)` — second defensive layer (no custom schema)
- `src/lib/handout-renderer.ts:14` — `.use(rehypeHighlight)` — runs AFTER sanitize; key pipeline-order fact
- `src/lib/__tests__/handout-renderer.test.ts:78–109` — existing XSS payload stripping describe block
- `src/lib/__tests__/handout-renderer.test.ts:95–98` — raw inline HTML test (proves `allowDangerousHtml: false`)
- `src/components/organisms/HandoutEditor.tsx:68` — `useMemo` render call (preview surface)
- `src/components/organisms/HandoutEditor.tsx:250` — `dangerouslySetInnerHTML` injection (preview)
- `src/pages/share/[token].astro:49` — SSR render call (share surface)
- `src/pages/share/[token].astro:63–65` — `<Fragment set:html={...}>` injection + boundary comment
- `vitest.config.ts:22–28` — unit project: `include: ['src/**/*.test.{ts,tsx}']`, excludes `src/integration/**`
- `package.json:35` — `rehype-sanitize@^6.0.0`

## Architecture Insights

1. **Single XSS boundary principle.** One function (`renderHandoutHtml`) owns all markdown-to-HTML
   conversion. Changing sanitization in one place covers both surfaces simultaneously. This was an
   explicit architectural decision (see Historical Context) and should never be relaxed.

2. **Defense in depth (both layers must stay).** `allowDangerousHtml: false` and `rehypeSanitize`
   are independent. Removing either one weakens the defense. Tests should implicitly guard both — the
   "strips raw inline HTML" test guards `allowDangerousHtml: false`; the protocol tests guard
   `rehypeSanitize`.

3. **Plugin pipeline order matters.** Any new plugin added to the `unified()` chain that runs AFTER
   `rehypeSanitize` operates on already-sanitized HTML. If it injects new nodes (e.g. wraps content
   in tags with attributes), those injections bypass sanitize. `rehypeHighlight` is safe (span +
   className only), but this constraint must be documented and guarded.

4. **Never store HTML.** Only `markdown_content` is persisted. The sanitizer is applied on every
   read, so there is no stale-output attack surface.

## Historical Context (from prior changes)

- `context/archive/2026-05-31-markdown-preview-and-parsing/research.md:28–35` — architectural
  decision: DOM-based sanitizers (`sanitize-html`, `isomorphic-dompurify`) rejected because they
  fail on Cloudflare workerd; `unified/remark/rehype` chosen as the only viable option for identical
  browser + workerd execution.
- `context/archive/2026-05-31-markdown-preview-and-parsing/research.md:114–127` — sanitization
  findings from the implementation phase: two layers, default GitHub-mirror schema, test coverage
  at that point.
- `context/archive/2026-05-31-markdown-preview-and-parsing/research.md:183–184` — open question at
  that time: "verify against the XSS tests" after adding rehype-highlight. Those tests now pass,
  confirming the pipeline order is safe.
- `context/archive/2026-06-03-testing-api-db-handout-coverage/research.md` — Phase 1 test rollout;
  this plan deliberately deferred renderer safety coverage to Phase 3.
- `context/foundation/lessons.md:33–38` — freeze unified processor singletons.

## Related Research

- `context/archive/2026-05-31-markdown-preview-and-parsing/research.md` — prior full-depth research
  on the rendering pipeline; this document updates and extends its security section.

## Open Questions

None blocking. The following are worth noting for the planning phase:

1. **GFM autolink protocol (Gap E)** — not a confirmed risk (GFM autolink spec requires `//` after
   scheme or email format), but a single test with a bare `javascript:` string would close the
   question cheaply.

2. **`<img src=...>` protocol handling** — the default schema allows `src` on `<img>` with no
   protocol restriction. `javascript:` src on an image is browser-harmless (images cannot execute
   scripts via `src`), but it is worth a quick assertion for completeness. The existing `data:` URI
   link test partially covers this concern.

3. **Future plugin additions after rehypeSanitize** — if `rehype-autolink-headings`,
   `rehype-external-links`, or similar plugins are ever added to the pipeline, they must be inserted
   BEFORE `rehypeSanitize`, not after. A comment in `handout-renderer.ts` would make this
   constraint visible.

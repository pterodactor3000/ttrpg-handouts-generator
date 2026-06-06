# Markdown Rendering Safety — Test Coverage (Phase 3)

## Overview

Add the missing bypass-variant assertions to the existing XSS test block in
`handout-renderer.test.ts` and add a one-line pipeline-order comment to
`handout-renderer.ts`. The core XSS protection and its canonical test coverage already exist;
Phase 3 closes the remaining gaps identified by research: protocol bypass variants, an SVG
vector, a pipeline-order contract test, and two supplementary edge-case assertions.

## Current State Analysis

`src/lib/__tests__/handout-renderer.test.ts` (lines 78–109) has a `describe('XSS payload
stripping')` block covering six adversarial vectors: `<script>`, `onerror=`, `javascript:`
hrefs, raw inline HTML, `style` injection, and `data:` URIs. These are correct and green.

The renderer (`src/lib/handout-renderer.ts`) runs a frozen six-step `unified()` pipeline.
`rehypeSanitize` runs at step 4 with the default GitHub-mirror schema. `rehypeHighlight` runs
at step 5 — after sanitize — which is safe today but is not documented as an ordering
constraint.

Four confirmed bypass gaps are not tested:
- **Gap A** — case-insensitive protocol (`JAVASCRIPT:`, `Javascript:`)
- **Gap B** — whitespace-prefixed or newline-encoded protocol
- **Gap C** — SVG vector (`<svg onload=...>`)
- **Gap D** — pipeline-order contract (hljs-decorated block still clean after rehypeHighlight)

Two supplementary assertions were also elected:
- **Gap E** — GFM bare `javascript:` string (not a valid autolink per spec; assert no href)
- **Gap img** — `<img src="javascript:...">` (browser-harmless but worth asserting clean)

## Desired End State

`npm test` (unit project) runs the full `handout-renderer.test.ts` suite and all new cases are
green. `npm run lint` is clean. `handout-renderer.ts` carries a short pipeline-order comment.
No new files are created; no existing tests are modified.

### Key Discoveries

- `src/lib/__tests__/handout-renderer.test.ts:78–109` — existing XSS describe block; new `it()`
  cases append to the end of this block
- `src/lib/handout-renderer.ts:13–14` — `rehypeSanitize` at step 4, `rehypeHighlight` at step 5;
  the comment goes between these two lines
- `vitest.config.ts:22–28` — unit project picks up `src/**/*.test.{ts,tsx}` automatically; no
  config change needed
- `allowDangerousHtml: false` (line 12) drops raw HTML before sanitize; all SVG/inline-HTML
  bypass paths already stripped at the remark-rehype step, so Gap C tests confirm defense-in-depth
- GFM autolink (`remark-gfm`) requires `//` after the scheme for non-email URLs — `javascript:`
  alone is not a valid autolink, so Gap E is a confirming regression guard, not a live risk

## What We're NOT Doing

- No new test file — additions go inside the existing `describe('XSS payload stripping')` block
- No changes to existing test cases — append only
- No changes to `HandoutEditor.test.tsx` — component-level XSS tests would mirror the renderer,
  adding noise without signal (single XSS boundary principle)
- No e2e or integration layer — DB is not involved; both render surfaces call the same function
- No CI/Quality-gate wiring — that is Phase 4's job
- No changes to the rehype-sanitize schema — the default GitHub-mirror schema is the intended
  configuration

## Implementation Approach

Single-phase: add the six new `it()` cases to `handout-renderer.test.ts`, then add the
pipeline-order comment to `handout-renderer.ts`. Both changes are small and independent; the
test additions are the primary deliverable.

## Critical Implementation Details

**Gap B (whitespace-prefixed protocol) is the one with real-world sanitizer history.** Some
parsers strip leading whitespace from `href` before protocol checking; others do not. The
WHATWG URL parser (used by browsers and by most JS URL implementations) treats a leading space
as an invalid scheme and falls back to treating the string as a relative path — so the `href`
may survive sanitize but resolve as a harmless relative URL rather than `javascript:`. The
assertion for Gap B is therefore: `not.toContain('javascript:')` in the output, not an
assumption about what the output will contain instead. The test verifies safety, not the exact
recovery behaviour.

**Gap D assertion shape.** The pipeline-order test feeds a language-tagged fenced block whose
code content includes a `<script>` injection attempt, then asserts the rendered output contains
the expected `hljs` class markup (proving highlight.js ran) AND does not contain `<script>` or
`onerror` (proving sanitize ran before highlight). Both assertions are needed to prove the
contract rather than just prove highlight.js is present.

---

## Phase 1: Add bypass-variant tests + pipeline-order comment

### Overview

Append six new `it()` cases to `describe('XSS payload stripping')` in
`handout-renderer.test.ts`, and add a one-line comment to `handout-renderer.ts` between
`.use(rehypeSanitize)` and `.use(rehypeHighlight)` explaining the ordering constraint.

### Changes Required

#### 1. Pipeline-order comment in the renderer

**File**: `src/lib/handout-renderer.ts`

**Intent**: Make the plugin ordering constraint visible to future contributors. Any plugin added
after `rehypeSanitize` runs on already-sanitized HTML; if it injects new nodes with `href`,
`src`, or `on*` attributes those additions bypass the sanitizer.

**Contract**: Add a single-line comment between `.use(rehypeSanitize)` (line 13) and
`.use(rehypeHighlight)` (line 14). The comment must make clear that post-sanitize plugins must
not introduce unsafe attributes:

```
  // rehypeHighlight must stay after rehypeSanitize; plugins after this point bypass sanitization
```

#### 2. Bypass-variant XSS test cases

**File**: `src/lib/__tests__/handout-renderer.test.ts`

**Intent**: Assert that six bypass vectors — not covered by the existing six cases — are also
neutralized by the renderer. Each new `it()` is appended at the end of the existing
`describe('XSS payload stripping')` block (after line 109, before the closing `}`).

**Contract**: Six new `it()` cases; each calls `renderHandoutHtml(input)` and asserts on the
returned string using `expect(output).not.toContain(...)`:

| Test name | Input | Assert not present |
|-----------|-------|--------------------|
| strips uppercase JAVASCRIPT: protocol | `[click](JAVASCRIPT:alert(1))` | `'javascript:'`, `'JAVASCRIPT:'` |
| strips mixed-case Javascript: protocol | `[click](Javascript:alert(1))` | `'javascript:'`, `'Javascript:'` |
| strips leading-space protocol in link | `[click]( javascript:alert(1))` | `'javascript:'` |
| strips SVG with event handler | `<svg onload=alert(1)>` | `'onload'`, `'<svg'` |
| GFM bare javascript: string is not converted to a link | `javascript:alert(1)` (plain text, no markdown link syntax) | `'href="javascript:'` |
| strips javascript: src on img | `<img src="javascript:alert(1)">` | `'javascript:'` |

**Gap D (pipeline order)** is addressed via one additional `it()` case that verifies the order
contract end-to-end:

| Test name | Input | Assert present | Assert not present |
|-----------|-------|----------------|--------------------|
| rehypeHighlight output does not reintroduce dangerous attributes | ` ```js\n<script>alert(1)</script>\n``` ` | `'hljs'` | `'<script>'`, `'alert(1)'` |

Total additions: 7 new `it()` cases inside the existing describe block.

### Success Criteria

#### Automated Verification

- All unit tests pass (new + existing): `npm test -- --project unit`
- Lint clean: `npm run lint`

#### Manual Verification

- Confirm the 7 new test names appear in the Vitest output under `XSS payload stripping`
- Confirm no existing test case titles were renamed or removed

**Implementation Note**: After all automated verification passes, pause for manual confirmation
before marking this phase complete.

---

## Testing Strategy

### Unit Tests

All coverage lives in `src/lib/__tests__/handout-renderer.test.ts`. Adversarial-input pattern:
feed a raw string into `renderHandoutHtml`, assert the dangerous token does not appear in the
output string. No snapshots; no benign-only assertions. See existing cases at lines 78–109 as
the reference pattern.

### Manual Testing Steps

1. Run `npm test -- --project unit` — all 35+ unit tests must be green
2. Scan the output for the 7 new test descriptions under `XSS payload stripping`
3. Run `npm run lint` — no errors

## References

- Research: `context/changes/testing-markdown-rendering-safety/research.md`
- Existing XSS tests (reference pattern): `src/lib/__tests__/handout-renderer.test.ts:78–109`
- Renderer pipeline: `src/lib/handout-renderer.ts:9–16`
- Prior rendering research: `context/archive/2026-05-31-markdown-preview-and-parsing/research.md`
- Test plan §2 Risk #3 + §3 Phase 3: `context/foundation/test-plan.md`

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Add bypass-variant tests + pipeline-order comment

#### Automated

- [x] 1.1 All unit tests pass (new + existing): `npm test -- --project unit` — 8a27a13
- [x] 1.2 Lint clean: `npm run lint` — 8a27a13

#### Manual

- [x] 1.3 7 new test names appear in Vitest output under `XSS payload stripping` — 8a27a13
- [x] 1.4 No existing test case titles renamed or removed — 8a27a13

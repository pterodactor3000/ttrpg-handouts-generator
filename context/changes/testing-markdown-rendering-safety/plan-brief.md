# Markdown Rendering Safety — Plan Brief

> Full plan: `context/changes/testing-markdown-rendering-safety/plan.md`
> Research: `context/changes/testing-markdown-rendering-safety/research.md`

## What & Why

Fill the remaining XSS bypass-variant gaps in the handout renderer's test suite and document the
pipeline ordering constraint in source. The core XSS protection is already proven by six existing
tests; Phase 3 asserts that case-insensitive protocols, whitespace-prefixed links, SVG vectors,
and the post-sanitize plugin order cannot be used to bypass the established defences.

## Starting Point

`src/lib/__tests__/handout-renderer.test.ts` has a `describe('XSS payload stripping')` block
(lines 78–109) covering six adversarial vectors. `src/lib/handout-renderer.ts` runs a frozen
`unified()` pipeline with `rehypeSanitize` at step 4 and `rehypeHighlight` at step 5 — the order
is safe but not documented.

## Desired End State

Seven new `it()` cases are appended to the existing XSS describe block, all green. A one-line
comment in `handout-renderer.ts` makes the post-sanitize plugin ordering constraint explicit.
`npm test -- --project unit` and `npm run lint` both pass. No new files; no existing tests
modified.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|-----------------|--------|
| Test layer | Unit only (existing file) | DB not involved; single renderer covers both surfaces | Research |
| Gap coverage | A–E + img src (full set, 7 cases) | Each is a 1-liner; completeness costs nothing | Plan |
| File placement | Append to existing XSS describe block | No new file — additions fit naturally alongside existing cases | Research |
| Pipeline comment | Yes — add to `handout-renderer.ts` | Makes ordering constraint visible to future contributors | Plan |
| Component-level XSS tests | Out of scope | Single boundary principle; component test would mirror the renderer | Research |
| CI wiring | Out of scope | Phase 4's job | Test plan §3 |

## Scope

**In scope:**
- 7 new `it()` cases inside `describe('XSS payload stripping')` in `handout-renderer.test.ts`
- 1-line pipeline-order comment in `handout-renderer.ts` between `.use(rehypeSanitize)` and `.use(rehypeHighlight)`

**Out of scope:**
- New test files or helpers
- Changes to existing test cases
- `HandoutEditor.test.tsx` XSS assertions
- rehype-sanitize schema customisation
- CI/quality-gate wiring (Phase 4)

## Architecture / Approach

All 7 tests follow the same adversarial-input pattern already used in lines 78–109:
`renderHandoutHtml(maliciousInput)` → assert dangerous token absent from output string. No
mocking, no fixtures, no async. The pipeline-order test (Gap D) additionally asserts that
`'hljs'` is present in the output, proving `rehypeHighlight` ran after sanitize rather than
being skipped.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|-----------------|----------|
| 1. Bypass-variant tests + pipeline comment | 7 new XSS tests green; ordering constraint documented | Gap B (whitespace-prefixed protocol) may produce a relative URL rather than strip entirely — assertion is `not.toContain('javascript:')`, not a fixed output expectation |

**Prerequisites:** Local Supabase not needed (unit tests only). `npm install` already complete.
**Estimated effort:** ~1 session, single phase.

## Open Risks & Assumptions

- Gap B output shape: the WHATWG URL parser may transform ` javascript:alert(1)` into a
  relative-path reference rather than stripping the href entirely. The test asserts `javascript:`
  is not present — this is the correct safety assertion regardless of the exact recovery output.
- Gap E (GFM autolink): per spec a bare `javascript:` string is not a valid autolink; the test
  confirms no `href="javascript:"` appears. If remark-gfm changes autolink handling this test
  would catch a regression.

## Success Criteria (Summary)

- `npm test -- --project unit` — all unit tests pass (new 7 + existing ~28)
- `npm run lint` — clean
- All 7 new test descriptions visible in Vitest output under `XSS payload stripping`

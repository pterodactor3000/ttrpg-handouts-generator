<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Per-Style Fonts

- **Plan**: context/changes/per-style-fonts/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-06-17
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 4 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING ⚠️ |
| Scope Discipline | WARNING ⚠️ |
| Safety & Quality | PASS ✅ |
| Architecture | WARNING ⚠️ |
| Pattern Consistency | PASS ✅ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Fantasy font changed from Glendora to Tisk

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/lib/fonts.ts:9, src/styles/global.css:6-9,299-301
- **Detail**: Plan specifies `'Glendora'` for fantasy (`@font-face`, `FONT_CONFIGS`, CSS selectors, manual verification notes). Implementation uses `'Tisk'` everywhere. `Glendora.otf` remains in `public/fonts/` but is unused. Tests assert Tisk. Likely an intentional mid-implementation font swap, but plan and progress notes were not updated.
- **Fix A ⭐ Recommended**: Update plan, plan-brief, and progress manual notes to document Tisk as the fantasy font; remove or document `Glendora.otf` if permanently retired.
  - Strength: Aligns documentation with shipped behavior; avoids future reviewers re-opening the font choice.
  - Tradeoff: Plan becomes a moving target; Glendora removal is a separate asset decision.
  - Confidence: HIGH — code, CSS, and tests are internally consistent on Tisk.
  - Blind spot: Stakeholder preference for Glendora vs Tisk not verified in this review.
- **Fix B**: Revert fantasy to Glendora across `@font-face`, `fonts.ts`, `global.css`, and tests.
  - Strength: Restores strict plan adherence.
  - Tradeoff: Loses the deliberate Tisk choice and any manual QA done on Tisk styling.
  - Confidence: MEDIUM — depends on whether Tisk was chosen for visual reasons.
  - Blind spot: Haven't compared Glendora vs Tisk rendering quality.
- **Decision**: FIXED via Fix A — plan and plan-brief updated to Tisk; Glendora.otf noted as superseded in plan

### F2 — Fantasy font-size overrides outside plan scope

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Scope Discipline
- **Location**: src/styles/global.css:304-327
- **Detail**: Plan guardrail: "No font size changes — only font family and text color." `global.css` adds fantasy-only rules: `h1` at `3.75rem`, prose at `2em`, and pre/code size overrides. scifi and horror have no equivalent size rules.
- **Fix A ⭐ Recommended**: If the larger fantasy typography is intentional, add a plan addendum documenting it as a discovered scope item.
  - Strength: Preserves shipped styling; updates source of truth.
  - Tradeoff: Weakens the "not doing font sizes" guardrail for this change.
  - Confidence: HIGH — rules are clearly present and fantasy-only.
  - Blind spot: Visual QA rationale for size bump not captured in commits.
- **Fix B**: Remove fantasy font-size blocks and rely on default `text-3xl` / prose sizing.
  - Strength: Restores plan scope discipline.
  - Tradeoff: May regress intentional visual tuning for High Fantasy handouts.
  - Confidence: MEDIUM — depends on GM preview expectations.
  - Blind spot: Haven't checked whether size rules were added in p2 or a later edit.
- **Decision**: FIXED via Fix A — plan addendum documents fantasy font-size overrides

### F3 — FONT_CONFIGS duplicated in CSS, not consumed at runtime

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architecture
- **Location**: src/lib/fonts.ts, src/styles/global.css:299-355
- **Detail**: Plan positions `fonts.ts` as the typed single source of truth. Runtime styling is entirely in `global.css` with hardcoded font-family and color values. `FONT_CONFIGS` is only imported by unit tests — a future edit to `fonts.ts` will not change rendered output unless `global.css` is updated separately.
- **Fix A ⭐ Recommended**: Add a unit test (or build-time check) that parses `global.css` category blocks and asserts values match `FONT_CONFIGS`.
  - Strength: Keeps CSS as the runtime mechanism while catching drift automatically.
  - Tradeoff: Test maintenance if CSS structure changes; still dual-authored.
  - Confidence: HIGH — pattern is straightforward to assert.
  - Blind spot: Parsing CSS in tests can be brittle if selectors change.
- **Fix B**: Generate category CSS from `FONT_CONFIGS` (e.g. inline style tag, CSS-in-JS, or build step).
  - Strength: True single source of truth.
  - Tradeoff: Larger architectural change; departs from current CSS-only theming decision.
  - Confidence: MEDIUM — Astro SSR + Tailwind may complicate injection.
  - Blind spot: Haven't evaluated Cloudflare build impact.
- **Decision**: FIXED via Fix A — added __tests__/lib/fonts-css-sync.test.ts

### F4 — HandoutArticle style tests inject CSS, not global.css

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: __tests__/components/molecules/HandoutArticle.test.tsx:30-40
- **Detail**: Font/color tests inject rules derived from `FONT_CONFIGS` because jsdom does not reliably compute `font-family` from imported stylesheets. This validates the `data-category` DOM hook and inheritance, but would not catch a mismatch between `FONT_CONFIGS` and actual `global.css` rules (e.g. fantasy font-size overrides, wrong hex in CSS).
- **Fix**: Add F3's CSS↔config sync test, or import `global.css` in a dedicated integration-style unit test with documented jsdom limitations for font-family only.
- **Decision**: FIXED — gap covered by fonts-css-sync.test.ts (F3); component tests retain DOM hook coverage

### F5 — Phase 1 commit bundled unplanned Astro/React SSR config

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: astro.config.mjs:25-31, package.json:87-91
- **Detail**: `astro.config.mjs` React dedupe/`server.edge` alias and `package.json` `allowScripts` were not in the plan. Commit message documents them as Cloudflare React SSR fixes. Benign scope creep, likely required to unblock dev/build during implementation.
- **Fix**: No code change required; optionally note in plan as infrastructure discovered during p1.
- **Decision**: ACCEPTED — benign infrastructure fix; no action needed

### F6 — Label corrections landed in pre-change commit

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/backgrounds.ts (commit 472399e)
- **Detail**: Plan Phase 1 required label swaps in `backgrounds.ts`. Labels are correct (`scifi` → Grimdark, `horror` → Eldritch), but the change landed in `472399e` before the per-style-fonts phase 1 commit, not inside `84d18ee`. Outcome matches plan; commit attribution differs.
- **Fix**: No code change required.
- **Decision**: ACCEPTED — outcome correct; commit attribution only differs

## Automated verification (re-run 2026-06-17)

| Command | Result |
|---------|--------|
| `npm run lint` | PASS (0 errors, 8 pre-existing no-console warnings) |
| `npm run build` | PASS |
| `npm test -- --project unit` | PASS (51 tests) |

## Manual verification (Progress section)

All manual Progress items marked `[x]` with commit SHAs. Manual notes still reference Glendora for fantasy (F1 documentation drift). No evidence of rubber-stamping beyond that doc mismatch.

## Positive notes

- Dual-component parity: `HandoutArticle.tsx` and `HandoutArticle.astro` both accept `category` and set `data-category`.
- Caller wiring correct: `HandoutEditor` uses `backgroundCategory ?? undefined`; share page passes `handout.background_category`.
- Per-category CSS placed after base prose overrides (correct cascade order).
- No new XSS surface — `dangerouslySetInnerHTML` / `set:html` still bounded by sanitizer.
- Test file locations follow repo convention (`__tests__/`), not plan's `src/**/__tests__/` paths.

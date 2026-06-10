<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: UI Restyle (S-05)

- **Plan**: context/changes/ui-restyle/plan.md
- **Scope**: Full plan (Phases 1–5)
- **Date**: 2026-06-09
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING ⚠️ |
| Scope Discipline | PASS ✅ |
| Safety & Quality | PASS ✅ |
| Architecture | PASS ✅ |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Editor preview omits title heading

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/organisms/HandoutEditor.tsx:268–273
- **Detail**: `HandoutArticle.astro` renders an `<h1>` title above prose content; the editor preview column renders only the markdown body. Phase 2 manual criterion 2.4 requires share view and editor preview to render identically for the same content.
- **Fix A ⭐ Recommended**: Add a title `<h1>` in the preview article using the current `title` state (fallback e.g. "Untitled"), matching `HandoutArticle` markup.
  - Strength: Achieves true preview/share parity without a cross-framework component.
  - Tradeoff: Preview updates live as the user types the title field.
  - Confidence: HIGH — structure is one heading element.
  - Blind spot: None significant.
- **Fix B**: Extract `HandoutArticle.tsx` and use in both editor preview and share (Astro still uses `.astro` wrapper).
  - Strength: Single React component for article shell.
  - Tradeoff: Astro/React boundary still requires two entry points; more files.
  - Confidence: MED — adds abstraction for modest gain.
  - Blind spot: Astro island hydration cost in preview.
- **Decision**: FIXED via Fix A

### F2 — Share page error branch still uses legacy glass styling

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/share/[token].astro:68–82
- **Detail**: Success branch uses `HandoutArticle` + palette tokens; error/not-configured card still uses `border-white/10 bg-white/10 text-white` and legacy CTA classes. Dashboard error states were migrated in Phase 3.
- **Fix**: Swap error card and CTA to `border-surface bg-surface text-foreground text-muted-foreground` and palette CTA tokens, mirroring `dashboard.astro` error panels.
- **Decision**: FIXED

### F3 — SubmitButton retains purple hardcoded colors

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/atoms/SubmitButton.tsx:18
- **Detail**: Phase 5 swapped the spinner for `.loader` but left `bg-purple-600 hover:bg-purple-500`. Auth pages were out of explicit restyle scope, yet this file was touched and stands out against the warm-dark palette elsewhere.
- **Fix**: Replace purple utilities with shadcn defaults (`Button` without color override, or `bg-primary text-primary-foreground hover:bg-primary/90`).
- **Decision**: FIXED

### F4 — Editor shell uses bg-cosmic instead of contracted bg-app

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/organisms/HandoutEditor.tsx:146
- **Detail**: Phase 4 contract specifies `bg-app`; implementation uses `bg-cosmic` to match `dashboard.astro`. Visually satisfies "editor and dashboard share one app background" end-state; utility name differs from plan text.
- **Fix**: No action required unless strict plan-text compliance is desired — `bg-cosmic` is the correct visual choice.
- **Decision**: SKIPPED

### F5 — Clipboard setTimeout lacks unmount cleanup

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/atoms/CopyLinkButton.tsx:20–27, src/components/organisms/ShareDialog.tsx:28–35
- **Detail**: `setTimeout` resets label after copy; no cleanup on unmount. Pre-existing pattern extended in Phase 5 loader work. Low risk given `client:idle` and brief timeouts.
- **Fix**: Store timeout ID in a ref; clear in `useEffect` cleanup.
- **Decision**: FIXED

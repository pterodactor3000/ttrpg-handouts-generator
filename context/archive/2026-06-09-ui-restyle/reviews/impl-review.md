<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: UI Restyle (S-05)

- **Plan**: context/changes/ui-restyle/plan.md
- **Scope**: Full plan (Phases 1–5)
- **Date**: 2026-06-13
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 2 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS ✅ |
| Scope Discipline | PASS ✅ |
| Safety & Quality | PASS ✅ |
| Architecture | PASS ✅ |
| Pattern Consistency | WARNING ⚠️ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Share success footer still uses legacy opacity token

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/pages/share/[token].astro:62
- **Detail**: Success-branch footer uses `text-white/40` while error/not-configured branches were migrated to palette tokens (`text-muted-foreground`, `border-surface`, etc.) in the prior review. Dashboard and share error panels are on-palette; this one line was missed.
- **Fix**: Replace `text-white/40` with `text-muted-foreground` to match the restyled chrome.
- **Decision**: FIXED

### F2 — ShareDialog copy state persists across open/close cycles

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/organisms/ShareDialog.tsx:19–58
- **Detail**: `copyButtonLabel` and `isCopying` are not reset when the dialog closes. Unmount cleanup (prior F5 fix) is correct, but reopening after a successful copy can show stale `"Copied!"` until the 2 s timeout fires. `CopyLinkButton` does not have this issue because it stays mounted.
- **Fix**: Reset `copyButtonLabel` to `'Copy link'` and `isCopying` to `false` in `handleOpenChange` when `isOpen` is `false`; clear any pending `resetTimeoutRef` timeout at the same time.
- **Decision**: FIXED

### F3 — Editor shell uses bg-cosmic instead of contracted bg-app

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/organisms/HandoutEditor.tsx:146
- **Detail**: Phase 4 contract specifies `bg-app`; implementation uses `bg-cosmic` to match `dashboard.astro`. Visually satisfies the end-state goal ("editor and dashboard share one app background"); utility name differs from plan text only.
- **Fix**: No action required unless strict plan-text compliance is desired — `bg-cosmic` is the correct visual choice.
- **Decision**: SKIPPED

### F4 — Editor preview article markup duplicates HandoutArticle.astro

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Pattern Consistency
- **Location**: src/components/organisms/HandoutEditor.tsx:268–274, src/components/molecules/HandoutArticle.astro:11–17
- **Detail**: Preview article shell (`<article.handout-article>` + `<h1>` + `prose` + sanitized HTML) mirrors `HandoutArticle.astro` manually. Phase 2 parity (title + prose scale) was restored via the prior F1 fix; structure is currently aligned but has no shared enforcement mechanism across the Astro/React boundary.
- **Fix**: Accept the CSS-class-layer approach as the single source of truth (per plan's Critical Implementation Details), or extract `HandoutArticle.tsx` for the editor while Astro keeps the `.astro` wrapper.
- **Decision**: FIXED

## Automated Verification (re-run 2026-06-13)

| Command | Result |
|---------|--------|
| `npm run lint` | PASS (0 errors; 6 pre-existing `no-console` warnings) |
| `npm test -- --project unit` | PASS (38/38) |
| `npm test -- --project integration` | SKIP locally — Supabase not running (`ECONNREFUSED 127.0.0.1:54321`); plan recorded pass at `30f3aa9` |
| `npm run build` | PASS |

## Prior Review Fixes — Verified Present

| Fix | Status |
|-----|--------|
| F1 Preview title in editor | Present (`HandoutEditor.tsx:269`) |
| F2 Share error branch palette | Present (`share/[token].astro:68–88`) |
| F3 SubmitButton purple removed | Present (`SubmitButton.tsx:15`) |
| F5 setTimeout unmount cleanup | Present (`CopyLinkButton.tsx`, `ShareDialog.tsx`) |

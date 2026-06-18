<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Retheme Backgrounds

- **Plan**: context/changes/retheme-backgrounds/plan.md
- **Scope**: Full plan (Phases 1–5)
- **Date**: 2026-06-18
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING ⚠️ |
| Scope Discipline | WARNING ⚠️ |
| Safety & Quality | PASS ✅ |
| Architecture | PASS ✅ |
| Pattern Consistency | PASS ✅ |
| Success Criteria | PASS ✅ |

## Findings

### F1 — Papyrus.otf committed but not referenced

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: public/fonts/Papyrus.otf
- **Detail**: Font asset was added in Phase 4 commit (a876574) per user request but has no `@font-face` declaration, no entry in `fonts.ts`, and no CSS reference. Dead asset in repo until wired or removed.
- **Fix A ⭐ Recommended**: Wire Papyrus into fantasy category via `fonts.ts` + `global.css` in a follow-up change
  - Strength: Asset is already committed; completes the intent of adding it.
  - Tradeoff: Out of S-09 scope; needs a new change or addendum.
  - Confidence: HIGH — mirrors S-07 font wiring pattern.
  - Blind spot: License/attribution for Papyrus not verified in repo.
- **Fix B**: Remove `Papyrus.otf` until a font change is planned
  - Strength: Keeps repo free of unused assets.
  - Tradeoff: User explicitly asked to include it.
  - Confidence: HIGH.
  - Blind spot: None significant.
- **Decision**: DEFERRED-FOLLOW-UP (Fix A — wire Papyrus in follow-up change)

### F2 — scifi-border.png below minimum size spec

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: public/borders/scifi-border.png
- **Detail**: Plan Phase 2 requires minimum 400×400px for sharp desktop rendering. Asset is 256×256. User manually verified border rendering (Progress 3.4, 3.8 marked complete), so it works at current slice settings but may look soft on large viewports.
- **Fix A ⭐ Recommended**: Replace with a ≥400px CRT bezel asset when visual tuning resumes
  - Strength: Meets plan spec; better scaling at desktop widths.
  - Tradeoff: Requires sourcing or upscaling; may need CSS slice retuning.
  - Confidence: MED — current asset passes manual QA at tested sizes.
  - Blind spot: Haven't measured rendered border sharpness at max viewport.
- **Fix B**: Document accepted deviation in plan addendum
  - Strength: Preserves user-provided asset and verified manual QA.
  - Tradeoff: Plan spec and reality diverge.
  - Confidence: HIGH if mobile-first is acceptable.
  - Blind spot: Desktop QA at full width not re-verified in review.
- **Decision**: FIXED (Fix B — documented accepted deviation in change.md)

### F3 — Untracked duplicate fantasy source file

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: public/borders/fantasy-paper-borders.png
- **Detail**: Duplicate of `fantasy-border.png` (identical 833×839 copy source). Untracked — not deployed, not referenced. Clutters asset directory.
- **Fix**: Delete `fantasy-paper-borders.png` or add to `.gitignore` if kept as local source only.
- **Decision**: FIXED (deleted fantasy-paper-borders.png)

| Check | Result |
|-------|--------|
| `npm run lint` | PASS (0 errors, 8 pre-existing warnings) |
| `npm run build` | PASS (Phase 2) |
| `npm test -- --project unit` | PASS (62 tests, including 7 new backgrounds tests) |
| Manual Progress items | All `[x]` with commit SHAs |

## Plan Adherence Summary

| Planned item | Verdict |
|--------------|---------|
| Phase 1 gradient values | MATCH |
| Phase 2 three border PNGs in `public/borders/` | MATCH |
| Phase 2 `.assetsignore` check | MATCH (no exclusion) |
| Phase 3 border-image CSS blocks | MATCH (contract values) |
| Phase 4 background-size on picker/card | MATCH |
| Phase 5 unit test | MATCH |
| S-07 blocks untouched | MATCH |
| Field shape unchanged | MATCH |

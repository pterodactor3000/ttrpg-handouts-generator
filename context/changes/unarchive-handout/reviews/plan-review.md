<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Unarchive Handout

- **Plan**: `context/changes/unarchive-handout/plan.md`
- **Mode**: Deep
- **Date**: 2026-10-01
- **Verdict**: SOUND after triage fixes
- **Findings**: 1 critical, 2 warnings, 0 observations

## Verdicts

| Dimension | Verdict at review | After fixes |
| --- | --- | --- |
| End-State Alignment | WARNING | PASS |
| Lean Execution | PASS | PASS |
| Architectural Fitness | FAIL | PASS |
| Blind Spots | WARNING | PASS |
| Plan Completeness | PASS | PASS |

## Grounding

10/10 existing paths, 4/4 symbols, brief matches plan.

## Findings

### F1 - Restore policy cannot veto a row that stays archived

- **Severity**: CRITICAL
- **Impact**: MEDIUM. Real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Phase 1, Update policy
- **Detail**: `gm_update_non_archived` is permissive and its WITH CHECK is only `gm_id = auth.uid()`. Permissive WITH CHECK expressions are OR'd, so `gm_restore_archived` cannot veto an update that leaves `status` as `archived`.
- **Fix**: Add a BEFORE UPDATE trigger that rejects that write, and add an integration check for it.
- **Decision**: FIXED

### F2 - Archived cards have no Edit node to reveal

- **Severity**: WARNING
- **Impact**: LOW. Quick decision; fix is obvious and narrowly scoped
- **Dimension**: End-State Alignment
- **Location**: Phase 2, Card move
- **Detail**: `HandoutCard.astro` omits `[data-handout-edit-action]` when status is `archived`, so a class toggle cannot show Edit.
- **Fix**: Render the Edit link on archived cards with the `hidden` class.
- **Decision**: FIXED

### F3 - Minted-token reload opens Drafts, so the card is hidden

- **Severity**: WARNING
- **Impact**: MEDIUM. Real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2, Restore dialog
- **Detail**: Reloading `/dashboard` resets the filter to Drafts, and the restored card sits in the hidden Published list.
- **Fix A, recommended**: The mover builds the title link and a copy button, then moves the card. No reload.
- **Fix B**: Reload `/dashboard?status=published` and teach the dashboard to open that list.
- **Decision**: FIXED via Fix A

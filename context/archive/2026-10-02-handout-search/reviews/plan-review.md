<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Handout search

- **Plan**: `context/changes/handout-search/plan.md`
- **Mode**: Deep
- **Date**: 2026-10-02
- **Verdict before fixes**: SOUND
- **Verdict**: SOUND
- **Findings**: 0 critical, 0 warnings, 0 observations

## Verdicts

| Dimension             | Verdict before fixes | Verdict after fixes |
| --------------------- | -------------------- | ------------------- |
| End-State Alignment   | PASS                 | PASS                |
| Lean Execution        | PASS                 | PASS                |
| Architectural Fitness | PASS                 | PASS                |
| Blind Spots           | PASS                 | PASS                |
| Plan Completeness     | PASS                 | PASS                |

## Grounding

12/12 existing paths exist. Five new files are creates: `src/lib/dashboard-search.ts`, `__tests__/lib/dashboard-search.test.ts`, `__tests__/lib/handout-list-search-empty.test.ts`, `src/components/molecules/DashboardSearch.tsx`, `__tests__/components/molecules/DashboardSearch.test.tsx`. Symbols `applyStatusFilter`, `applyDashboardTypeFilter`, `BACKGROUND_CONFIGS`, and `data-handout-title` match the cited files. `data-search-active`, `data-search-hidden`, and `data-handout-tags` are absent from the source. No `docs/reference/contract-surfaces.md`.

The brief and the plan agree on the 2 character threshold, the match fields, `data-search-hidden`, the status override, and the three empty sentences.

Progress has one `## Progress` block. The three phase names match. Each success-criterion bullet has a matching checkbox. Phase bodies use plain bullets. No checkboxes sit outside Progress.

Checked against the code, and not filed:

- `[data-dashboard]` carries `data-status-filter="draft"` and `data-type-filter="all"`. Published and Archived render the HTML `hidden` attribute. `applyStatusFilter` in `DashboardDrawer.tsx` is the only writer of that attribute. `applyTypeFilter` only updates `data-type-filter` and calls `applyDashboardTypeFilter`. Tailwind preflight sets `[hidden]` to `display: none !important`, so the plan removes the attribute while `data-search-active` is set. Archive removes the `hidden` class from the archived section and leaves the attribute in place. Replacing the list loop does not fight the drawer.

- `HandoutTagRow` renders only the chips that fit. After measurement, overflow tags are not in the article. The tag dialog is portaled outside the article. The full list belongs on `data-handout-tags`. Restore copies the title text onto a new `[data-handout-title]` when it replaces that node, and `prepend` keeps the article attributes.

- `:has(article)` hides the status sentence while any card exists, including a type-hidden card. The Astro compiler leaves the search `:has()` clause unscoped, same as the type-empty rule in `HandoutList.astro`. In jsdom, no articles shows the status sentence, every non-type-hidden search miss shows "No handouts match this search.", and every type-hidden card shows "No handouts of this type." A bare create link stays `display: inline` inside a `display: none` container, matching `__tests__/lib/handout-list-type-empty.test.ts`.

- Stored values are `fantasy`, `horror`, and `scifi`. Labels in `BACKGROUND_CONFIGS` are High Fantasy, Eldritch, and Grimdark. `postapo` is not stored and is not a label.

## Findings

No findings.

## Triage

No findings to triage. `plan.md` and `plan-brief.md` were not edited.

Verdict after checks: SOUND. Safe to implement.

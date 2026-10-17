# Linear Issues Report — TTRPG Handouts Generator

**Date:** 2026-06-29  
**Source:** `@ttrpg-handouts/daily-report` (Linear GraphQL + GitHub read-only)  
**Team:** Tech Heresy  
**Project:** TTRPG Handouts Generator  
**Roadmap:** `context/foundation/roadmap.md` (project: TTRPG Handouts Generator)

---

## Summary

| Metric | Count |
| ------ | ----- |
| Total issues (project + team) | 19 |
| Open (active) | 5 |
| Done | 10 |
| Canceled | 4 |
| PRs to review | 0 |
| Missing assignee | 5 |
| Missing acceptance criteria | 5 |
| No priority set | 5 |
| Stale (14+ days, active) | 0 |

---

## PRs to review

| PR | Title | Linear | Review state | Action |
| -- | ----- | ------ | ------------ | ------ |
| — | None | — | — | — |

### Proposed review actions (copy-paste for agent)

```text
No open PRs awaiting review.
```

```bash
gh pr list --repo pterodactor3000/ttrpg-handouts-generator --state open
```

---

## Open issues

| ID | Roadmap | Change ID | Title | Labels | Assignee | Priority | Last updated |
| -- | ------- | --------- | ----- | ------ | -------- | -------- | ------------ |
| [TEC-19](https://linear.app/tech-heresy/issue/TEC-19/s-10square-ui-containers-feat-squared-ui-containers-across-all-screens) | S-10 | `square-ui-containers` | // [S-10]::[square-ui-containers] // feat: squared UI containers across all screens | `needs-acceptance-criteria`, `needs-owner`, `slice` | — | None | 2026-06-25 |
| [TEC-20](https://linear.app/tech-heresy/issue/TEC-20/s-11dashboard-tile-style-feat-themed-top-strip-and-uniform-dashboard) | S-11 | `dashboard-tile-style` | // [S-11]::[dashboard-tile-style] // feat: themed top-strip and uniform dashboard tiles | `needs-acceptance-criteria`, `needs-owner`, `slice` | — | None | 2026-06-25 |
| [TEC-21](https://linear.app/tech-heresy/issue/TEC-21/s-12dashboard-drawer-nav-feat-left-drawer-with-draftspublishedarchived) | S-12 | `dashboard-drawer-nav` | // [S-12]::[dashboard-drawer-nav] // feat: left drawer with drafts/published/archived filter | `needs-acceptance-criteria`, `needs-owner`, `slice` | — | None | 2026-06-25 |
| [TEC-22](https://linear.app/tech-heresy/issue/TEC-22/s-13remove-account-feat-soft-delete-account-with-30-day-retention) | S-13 | `remove-account` | // [S-13]::[remove-account] // feat: soft-delete account with 30-day retention | `needs-acceptance-criteria`, `needs-owner`, `slice` | — | None | 2026-06-25 |
| [TEC-23](https://linear.app/tech-heresy/issue/TEC-23/s-14unarchive-handout-feat-restore-archived-handout-to-draft-or) | S-14 | `unarchive-handout` | // [S-14]::[unarchive-handout] // feat: restore archived handout to draft or published | `needs-acceptance-criteria`, `needs-owner`, `slice` | — | None | 2026-06-25 |

**Blocked / sequencing:**

- TEC-19: blocked by TEC-14
- TEC-20: blocked by TEC-18, TEC-7
- TEC-21: blocked by TEC-9, TEC-7
- TEC-22: blocked by TEC-5
- TEC-23: blocked by TEC-9, TEC-21

---

## Hygiene issues


### 1. Missing assignee (`needs-owner`)

| ID | Title |
| -- | ----- |
| TEC-19 | // [S-10]::[square-ui-containers] // feat: squared UI containers across all screens |
| TEC-20 | // [S-11]::[dashboard-tile-style] // feat: themed top-strip and uniform dashboard tiles |
| TEC-21 | // [S-12]::[dashboard-drawer-nav] // feat: left drawer with drafts/published/archived filter |
| TEC-22 | // [S-13]::[remove-account] // feat: soft-delete account with 30-day retention |
| TEC-23 | // [S-14]::[unarchive-handout] // feat: restore archived handout to draft or published |

### 2. Missing acceptance criteria (`needs-acceptance-criteria`)

| ID | Title |
| -- | ----- |
| TEC-19 | // [S-10]::[square-ui-containers] // feat: squared UI containers across all screens |
| TEC-20 | // [S-11]::[dashboard-tile-style] // feat: themed top-strip and uniform dashboard tiles |
| TEC-21 | // [S-12]::[dashboard-drawer-nav] // feat: left drawer with drafts/published/archived filter |
| TEC-22 | // [S-13]::[remove-account] // feat: soft-delete account with 30-day retention |
| TEC-23 | // [S-14]::[unarchive-handout] // feat: restore archived handout to draft or published |

### 3. No priority set

| ID | Title |
| -- | ----- |
| TEC-19 | // [S-10]::[square-ui-containers] // feat: squared UI containers across all screens |
| TEC-20 | // [S-11]::[dashboard-tile-style] // feat: themed top-strip and uniform dashboard tiles |
| TEC-21 | // [S-12]::[dashboard-drawer-nav] // feat: left drawer with drafts/published/archived filter |
| TEC-22 | // [S-13]::[remove-account] // feat: soft-delete account with 30-day retention |
| TEC-23 | // [S-14]::[unarchive-handout] // feat: restore archived handout to draft or published |

### 4. Stale (14+ days, active)

| ID | Title |
| -- | ----- |
| — | None |

---

## Proposed cleanup actions

These actions mutate Linear. Run only after explicit user approval.

### Action A — Assign owners (remove `needs-owner`)

**Agent prompt (copy-paste):**

```text
Assign TEC-19, TEC-20, TEC-21, TEC-22, TEC-23 to me in Linear. Remove the needs-owner label from each. Wait for my approval before calling save_issue.
```

**MCP examples (after approval):**

```json
// user-linear → save_issue
{
  "id": "TEC-19",
  "assignee": "me",
  "labels": [
    "needs-acceptance-criteria",
    "slice"
  ]
}

// user-linear → save_issue
{
  "id": "TEC-20",
  "assignee": "me",
  "labels": [
    "needs-acceptance-criteria",
    "slice"
  ]
}

// user-linear → save_issue
{
  "id": "TEC-21",
  "assignee": "me",
  "labels": [
    "needs-acceptance-criteria",
    "slice"
  ]
}

// user-linear → save_issue
{
  "id": "TEC-22",
  "assignee": "me",
  "labels": [
    "needs-acceptance-criteria",
    "slice"
  ]
}

// user-linear → save_issue
{
  "id": "TEC-23",
  "assignee": "me",
  "labels": [
    "needs-acceptance-criteria",
    "slice"
  ]
}

```

### Action B — Add acceptance criteria (remove `needs-acceptance-criteria`)

**Agent prompt (copy-paste):**

```text
For TEC-19, TEC-20, TEC-21, TEC-22, TEC-23, append ## Acceptance criteria from context/foundation/roadmap.md, then remove needs-acceptance-criteria. Show proposed AC before writing.
```

### Action G — PR review queue

**Agent prompt (copy-paste):**

```text
No PRs in review queue.
```

### Action D — Full interactive backlog rite

**Agent prompt (copy-paste):**

```text
Run /rites-of-cleaning for team Tech Heresy, project TTRPG Handouts Generator. Confirm scope, then walk through Steps 1–7. Do not mutate Linear without my explicit approval at each step.
```

---

## Retention

| File | Age (days) | Decision | Reason |
| ---- | ---------- | -------- | ------ |
| ttrpg-handouts-generator-2026-06-29.md | 0 | SKIP | Today's report |

---

## Skills reference

| Skill | Path | Purpose |
| ----- | ---- | ------- |
| rites-of-cleaning | `.cursor/skills/rites-of-cleaning/SKILL.md` | Approval-gated backlog hygiene |
| rites-of-status-query | `.cursor/skills/rites-of-status-query/SKILL.md` | Read-only blocked / review-ready / focus report |
| rites-of-review | `.cursor/skills/rites-of-review/SKILL.md` | PR review rite |

---

*Generated read-only. No Linear or GitHub mutations were performed during this report.*
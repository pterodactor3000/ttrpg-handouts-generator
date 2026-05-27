---
name: litanies-of-cleaning
description: Audits and cleans a Linear backlog via MCP — flags stale issues (no update in 2+ weeks), closes duplicate issues, and tags issues missing an assignee or acceptance criteria. Use when the user says "clean Linear backlog", "litanies of cleaning", "find stale tickets", "close duplicate issues", "tag issues without owner", "tag issues without acceptance criteria", or similar.
disable-model-invocation: true
---

# litanies-of-cleaning

Runs four backlog-hygiene passes against the current Linear workspace (optionally scoped to one team or project). Read-only discovery first, then apply fixes in parallel where safe.

## Step 0 — Scope

Read `context/foundation/roadmap.md` frontmatter for `project:` when present.

Call `list_teams`. Pick the team matching the roadmap `project:` field, or the only team if there is one. If multiple teams and no match, ask the user which team (and optional `project`) to clean.

Call `list_issue_statuses` for that team. Note the canceled/duplicate state names (often `Canceled`, `Duplicate`, or `Cancelled`).

## Step 1 — Ensure hygiene labels

Call `list_issue_labels`. Create any missing labels in parallel via `create_issue_label`:

| Label | Color | Description |
|---|---|---|
| `needs-owner` | `#EF4444` | Open issue has no assignee |
| `needs-acceptance-criteria` | `#F97316` | Issue description lacks acceptance criteria |

Do **not** create a label for stale issues — stale items are reported only (see Step 2).

## Step 2 — Fetch open issues

Paginate `list_issues` until exhausted:

- `team`: scoped team
- `project`: only if user or roadmap scoped a project
- `state`: active states only — exclude completed/canceled/duplicate (call per active state, or fetch all and filter client-side using status type from `list_issue_statuses`)
- `limit`: 250
- `orderBy`: `updatedAt`

Collect for each issue: `id`, `title`, `description`, `assignee`, `labels`, `state`, `createdAt`, `updatedAt`, `url`.

**Stale threshold:** 14 days before today (`updatedAt` older than `-P14D`). An issue is **stale** when it is in an active state and `updatedAt` is before that cutoff.

## Step 3 — Stale pass (report only)

Build the stale list. Do not change stale issues unless the user explicitly asked to close or tag them in the same request.

## Step 4 — Duplicate pass

Group open issues that are duplicates using these keys (check in order):

1. **Change ID** — extract `` `change-id` `` from `**Change ID:**` in the description (roadmap-synced issues)
2. **Normalized title** — lowercase, trim, collapse whitespace, strip `(foundation)` prefix

When a group has 2+ issues:

1. Pick the **canonical** issue: prefer the one already in `In Progress` or `Done`; otherwise the one with the most recent `updatedAt`; tie-break on lowest numeric identifier.
2. For every non-canonical issue in the group, call `save_issue` with:
   - `id`: duplicate issue identifier
   - `duplicateOf`: canonical issue identifier
   - `state`: the team's duplicate or canceled status (prefer `Duplicate` when available)

Run all duplicate closures in parallel. Skip issues already marked `duplicateOf`.

## Step 5 — Tag issues without owner

From the open-issue set (post-duplicate closure, re-fetch if needed):

- **Missing owner:** `assignee` is null/empty and state is active.

For each, call `save_issue` with `labels` set to existing labels **plus** `needs-owner` (preserve other labels — pass the full merged list). Skip if `needs-owner` is already present.

Run in parallel.

## Step 6 — Tag issues without acceptance criteria

An issue **has acceptance criteria** when its description contains any of (case-insensitive):

- A markdown heading matching `## Acceptance criteria` or `## Acceptance Criteria`
- A markdown heading matching `## AC`

Otherwise it is **missing acceptance criteria**.

For each open issue missing AC, call `save_issue` with `labels` set to existing labels **plus** `needs-acceptance-criteria`. Skip if label already present.

Run in parallel.

## Step 7 — Report

Print four sections:

```
## Stale (no update in 14+ days) — report only
| ID | Title | Last updated | Days stale |
|----|-------|--------------|------------|
| …  | …     | …            | …          |

## Duplicates closed
| Closed | Canonical | Match reason |
|--------|-----------|--------------|
| …      | …         | change-id / title |

## Tagged needs-owner
| ID | Title |
|----|-------|
| …  | …     |

## Tagged needs-acceptance-criteria
| ID | Title |
|----|-------|
| …  | …     |

Summary: <N> stale, <N> duplicates closed, <N> tagged needs-owner, <N> tagged needs-acceptance-criteria
```

If any duplicate group is ambiguous (same priority, no Change ID, titles differ slightly), list it under **Needs review** and do not close until the user picks the canonical issue.

## Notes

- Pass string values to MCP tools without escape sequences — use literal newlines in markdown fields.
- Stale detection uses `updatedAt`, not `createdAt`.
- Duplicate closure is destructive — when in doubt, report instead of closing.
- Removing labels or assignees is out of scope; this skill only adds hygiene labels and closes confirmed duplicates.
- Re-running is idempotent: already-tagged and already-closed duplicates are skipped.

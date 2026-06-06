---
name: rites-of-cleaning
description: Audits and cleans a Linear backlog via MCP — flags stale issues (no update in 2+ weeks), closes duplicate issues, and tags issues missing an assignee or acceptance criteria. Use when the user says "clean Linear backlog", "rites of cleaning", "find stale tickets", "close duplicate issues", "tag issues without owner", "tag issues without acceptance criteria", or similar.
disable-model-invocation: true
---

# rites-of-cleaning

Runs four backlog-hygiene passes against the current Linear workspace (optionally scoped to one team or project). **Interactive and approval-gated** — discovery first, then mutate only after the user explicitly approves each step.

## Audit comments (after every write)

After **each** successful mutation to a Linear issue, post an audit comment on that issue **and** the identical body on GitHub when a PR is linked or matched to that issue.

### Format

```
// [<who>] // ::RITES OF CLEANING:: // <when> //
<what changed; why>
```

- **`<who>`** — approving user's Linear display name when known, otherwise `cogitator`
- **`<when>`** — ISO 8601 UTC timestamp, e.g. `2026-05-28T14:30:00Z`
- Body line — fields changed (old → new when relevant) and reason (e.g. "approved duplicate closure in Step 4")

### Linear

Immediately after each successful `save_issue`, call `save_comment` with `issueId` set to the mutated issue and `body` set to the audit comment. Batch comment calls in parallel when multiple issues were updated in the same step.

### GitHub

When the issue has a linked PR or a PR matches by change-id / branch, post the **same** body:

```bash
gh pr comment <number> --repo <owner>/<repo> --body "$(cat <<'EOF'
// [<who>] // ::RITES OF CLEANING:: // <when> //
<what changed; why>
EOF
)"
```

Skip GitHub when no PR is associated with that issue.

## Approval rules (apply to every step)

1. **No silent mutations.** Do not call `save_issue`, `create_issue_label`, or any other write MCP tool until the user has approved that step's proposed changes.
2. **Show affected tickets.** Before any backlog change, print a markdown table listing every issue (or label) that will be created, updated, or closed. Include enough context for the user to approve or reject (ID, title, current state, proposed action).
3. **Wait for step-specific input.** After presenting a table, stop and wait. Accept only explicit user instruction — e.g. "approve", "proceed", "skip", "close TEC-3 only", "use TEC-6 as canonical". Do not infer approval from the original request to run the skill.
4. **Step completion gate.** A step is finished **only** after the user responds to that step (approval to apply, approval to skip, or correction). Do not start the next step until the current step is explicitly closed by user input.
5. **Ambiguous cases.** When duplicate groups or scope are unclear, list them in the table under a **Needs review** row and wait for the user to pick — never auto-resolve.

## Step 0 — Scope

Read `context/foundation/roadmap.md` frontmatter for `project:` when present.

Call `list_teams`. Pick the team matching the roadmap `project:` field, or the only team if there is one. If multiple teams and no match, ask the user which team (and optional `project`) to clean.

Present the resolved scope:

| Field           | Value                    |
| --------------- | ------------------------ |
| Team            | …                        |
| Project         | … (or "all team issues") |
| Stale threshold | 14 days                  |

**Wait for user confirmation** of scope before continuing.

Call `list_issue_statuses` for that team. Note the canceled/duplicate state names (often `Canceled`, `Duplicate`, or `Cancelled`).

**Wait for user confirmation** to proceed to Step 1.

## Step 1 — Ensure hygiene labels

Call `list_issue_labels`. Identify missing labels:

| Label                       | Color     | Description                                 |
| --------------------------- | --------- | ------------------------------------------- |
| `needs-owner`               | `#EF4444` | Open issue has no assignee                  |
| `needs-acceptance-criteria` | `#F97316` | Issue description lacks acceptance criteria |

Do **not** create a label for stale issues — stale items are reported only (see Step 3).

If any labels are missing, show:

| Label                       | Action |
| --------------------------- | ------ |
| `needs-owner`               | Create |
| `needs-acceptance-criteria` | Create |

**Wait for user approval** to create labels. If none missing, show "No label changes needed" and **wait for user confirmation** to proceed.

Create approved labels in parallel via `create_issue_label`.

**Wait for user confirmation** that Step 1 is complete before Step 2.

## Step 2 — Fetch open issues

Paginate `list_issues` until exhausted:

- `team`: scoped team
- `project`: only if user or roadmap scoped a project
- `state`: active states only — exclude completed/canceled/duplicate (call per active state, or fetch all and filter client-side using status type from `list_issue_statuses`)
- `limit`: 250
- `orderBy`: `updatedAt`

Collect for each issue: `id`, `title`, `description`, `assignee`, `labels`, `state`, `createdAt`, `updatedAt`, `url`.

**Stale threshold:** 14 days before today (`updatedAt` older than `-P14D`). An issue is **stale** when it is in an active state and `updatedAt` is before that cutoff.

Present a brief inventory (read-only):

| Metric                      | Count |
| --------------------------- | ----- |
| Open issues fetched         | …     |
| Stale (14+ days)            | …     |
| Potential duplicate groups  | …     |
| Missing assignee            | …     |
| Missing acceptance criteria | …     |

**Wait for user confirmation** to begin cleaning passes (Steps 3–6).

## Step 3 — Stale pass (report only)

Build the stale list. **Do not change stale issues** unless the user explicitly approves an action in this step.

Show:

```
## Stale (no update in 14+ days) — report only
| ID | Title | Last updated | Days stale |
|----|-------|--------------|------------|
| …  | …     | …            | …          |
```

If none: single row `| — | None | — | — |`.

**Wait for user input** — acknowledge, request close/tag actions, or approve proceeding. Apply any user-requested stale actions only after a second approval table listing affected tickets. Post an audit comment on each issue changed (and on any linked GitHub PR).

**Wait for user confirmation** that Step 3 is complete before Step 4.

## Step 4 — Duplicate pass

Group open issues that are duplicates using these keys (check in order):

1. **Change ID** — extract `` `change-id` `` from `**Change ID:**` in the description (roadmap-synced issues)
2. **Normalized title** — lowercase, trim, collapse whitespace, strip `(foundation)` prefix

When a group has 2+ issues:

1. Pick the **canonical** issue: prefer the one already in `In Progress` or `Done`; otherwise the one with the most recent `updatedAt`; tie-break on lowest numeric identifier.
2. For every non-canonical issue in the group, plan closure via `save_issue` with:
   - `id`: duplicate issue identifier
   - `duplicateOf`: canonical issue identifier
   - `state`: the team's duplicate or canceled status (prefer `Duplicate` when available)

Skip issues already marked `duplicateOf`.

**Before any write**, show all proposed closures:

```
## Proposed duplicate closures — awaiting approval
| Close (ID) | Title | Canonical (ID) | Match reason |
|------------|-------|----------------|--------------|
| …          | …     | …              | change-id / title |
```

If any group is ambiguous (same priority, no Change ID, titles differ slightly), add a **Needs review** section instead of proposing closures:

| Group | Issues | Reason ambiguous |
| ----- | ------ | ---------------- |
| …     | …      | …                |

**Wait for user approval** — user must confirm the table or designate canonical issues for ambiguous groups. Do not call `save_issue` until approved.

After approval, run duplicate closures in parallel. Post an audit comment on each closed issue (and on any linked GitHub PR). Then show results:

```
## Duplicates closed
| Closed | Canonical | Match reason |
|--------|-----------|--------------|
| …      | …         | change-id / title |
```

If user declined or skipped: note "No duplicate closures applied."

**Wait for user confirmation** that Step 4 is complete before Step 5.

## Step 5 — Tag issues without owner

From the open-issue set (post-duplicate closure, re-fetch if duplicates were closed):

- **Missing owner:** `assignee` is null/empty and state is active.

**Before any write**, show all issues that would be tagged:

```
## Proposed needs-owner tags — awaiting approval
| ID | Title | Current labels | Action |
|----|-------|----------------|--------|
| …  | …     | …              | Add `needs-owner` |
```

Skip issues that already have `needs-owner` — do not include them. If none: single row `| — | None | — | — |`.

**Wait for user approval** to apply tags.

After approval, call `save_issue` with `labels` set to existing labels **plus** `needs-owner` (preserve other labels — pass the full merged list). Run in parallel. Post an audit comment on each tagged issue (and on any linked GitHub PR).

Show applied tags:

```
## Tagged needs-owner
| ID | Title |
|----|-------|
| …  | …     |
```

**Wait for user confirmation** that Step 5 is complete before Step 6.

## Step 6 — Tag issues without acceptance criteria

An issue **has acceptance criteria** when its description contains any of (case-insensitive):

- A markdown heading matching `## Acceptance criteria` or `## Acceptance Criteria`
- A markdown heading matching `## AC`

Otherwise it is **missing acceptance criteria**.

**Before any write**, show all issues that would be tagged:

```
## Proposed needs-acceptance-criteria tags — awaiting approval
| ID | Title | Current labels | Action |
|----|-------|----------------|--------|
| …  | …     | …              | Add `needs-acceptance-criteria` |
```

Skip issues that already have the label. If none: single row `| — | None | — | — |`.

**Wait for user approval** to apply tags.

After approval, call `save_issue` with `labels` set to existing labels **plus** `needs-acceptance-criteria`. Run in parallel. Post an audit comment on each tagged issue (and on any linked GitHub PR).

Show applied tags:

```
## Tagged needs-acceptance-criteria
| ID | Title |
|----|-------|
| …  | …     |
```

**Wait for user confirmation** that Step 6 is complete before Step 7.

## Step 7 — Final summary

Print only after Step 6 is confirmed complete:

```
Summary: <N> stale (reported), <N> duplicates closed, <N> tagged needs-owner, <N> tagged needs-acceptance-criteria
```

Include any steps the user skipped. **Wait for user acknowledgment** to close the rite.

## Notes

- Pass string values to MCP tools without escape sequences — use literal newlines in markdown fields.
- Stale detection uses `updatedAt`, not `createdAt`.
- Duplicate closure is destructive — when in doubt, report instead of closing.
- Removing labels or assignees is out of scope; this skill only adds hygiene labels and closes confirmed duplicates.
- Re-running is idempotent: already-tagged and already-closed duplicates are skipped.
- The user's initial request to run this skill is **not** blanket approval for all steps — each step requires its own explicit input.
- Every `save_issue` must be followed by an audit comment on Linear (and GitHub when a PR is linked) — see **Audit comments** above.

---
name: rites-of-status-query
description: Produces a short status report from Linear and roadmap context — blocked issues, review-ready issues, out-of-scope items, issues out of radar, and a focus recommendation. Use when the user says "rites of status query", "project status", "what should we focus on", "what's blocked", "issues out of radar", "status report", or similar.
disable-model-invocation: true
---

# rites-of-status-query

Read-only. Gathers Linear issues, GitHub PRs, and foundation docs, then prints a **short** report as markdown tables. Target length: under 50 lines total.

## Step 0 — Gather context

Read in parallel:

- `context/foundation/roadmap.md` — frontmatter (`project:`, `main_goal`, `top_blocker`), `## At a glance`, `## North star`, `## Backlog Handoff`, `## Parked`, every item's **Prerequisites**, **Blockers**, **Status**
- `context/foundation/prd.md` — `## Non-Goals` only

Call `list_teams`. Pick the team matching roadmap `project:`, or the only team.

Call `list_projects` with `query: <project name>` when a project exists.

Paginate `list_issues` twice when a project is scoped:

1. **Project issues** — `team` + `project`, `limit: 250` (primary backlog)
2. **Team issues** — `team` only, `limit: 250` (catch items outside the project)

For issues that may be blocked, review-ready, or out of radar, call `get_issue` with `includeRelations: true` on a focused subset, not every issue.

Fetch open PRs when `gh` is available:

```bash
gh pr list --repo <owner>/<repo> --state open --limit 50 \
  --json number,title,url,headRefName,reviewDecision,isDraft
```

Fallback: `list_diffs` with `status: open`.

Build a roadmap index: every F-NN / S-NN and `change-id` → Linear issue id (from `**Roadmap ID:**` and `**Change ID:**` in descriptions). Flag roadmap ids with no matching Linear issue.

**Stale threshold:** 14 days — `updatedAt` older than `-P14D`.

## Step 1 — Classify blocked

An issue is **blocked** when any of:

1. Linear `blockedBy` relations exist (`get_issue` relations)
2. Roadmap **Blockers:** field is non-empty (`—` means none)
3. Roadmap **Status:** is `blocked`
4. A prerequisite roadmap item is not **Done** in Linear (state type completed) — e.g. S-01 blocked while F-01 is open
5. Linear workflow state name contains "Blocked" (case-insensitive)

Add one row per blocked issue. If none, use a single row: `| — | None | — |`.

## Step 2 — Classify review-ready

An issue is **review-ready** when any of:

1. An **open, non-draft** GitHub PR is linked to it (issue links or matched by change-id branch)
2. Linear state is `In Review` / `Review` (team-specific name)
3. `list_diffs` shows an open diff tied to the issue

Add one row per review-ready issue. If none, use a single row: `| — | None | — |`.

## Step 3 — Out of scope

Intentionally deferred or not-yet-sequenced work — dedupe by name:

**From docs** — every item under roadmap `## Parked` and PRD `## Non-Goals` (title only). Source column: `Parked` or `Non-Goal`.

**From backlog** — roadmap items whose prerequisites are not yet satisfied **and** that item is not the next unblocked item in dependency order. Source: `Future`. Note column: `waits on <prereq>`.

If empty, use a single row: `| — | None | — |`.

## Step 4 — Out of radar

Active work that exists but is **not tracked** against the roadmap/project plan. An item is **out of radar** when any of:

1. **No roadmap link** — Linear issue has no `**Roadmap ID:**` in description and no matching `change-id` in title, branch, or labels
2. **Outside project** — issue is in the team backlog but not in the scoped project (compare team vs project fetches)
3. **Stale** — active state, no update in 14+ days, and not review-ready
4. **PR unmatched** — open, non-draft GitHub PR with no linked Linear issue (match by PR url, change-id in branch, or Linear id in body)
5. **Missing in Linear** — roadmap F-NN / S-NN has no corresponding Linear issue

Exclude items already listed in Blocked or Review ready. Dedupe by id.

Add one row per item. If none, use a single row: `| — | None | — |`.

## Step 5 — Focus now

Pick **one** primary recommendation plus up to two alternates. Reason using, in order:

1. Roadmap `## Backlog Handoff` — first row where "Ready for `/10x-plan`" is `yes` and prerequisites are done
2. Roadmap `main_goal` and `top_blocker` frontmatter — prefer unblocking the top blocker or advancing the north star
3. **Review-ready** items trump new work — merge/review open PRs first when present
4. Dependency order — never recommend a slice whose prerequisites aren't done
5. **Out of radar** — if `Missing in Linear` or `No roadmap link` items exist, suggest `/rites-of-roadmap` or `/rites-of-review` in the **Also** row when relevant

Fill the Focus now table (Step 6). Omit the **Also** row when there is no alternate.

## Step 6 — Report

Use this exact structure. Keep each data table to ≤6 rows; if truncated, add a final row `| +N more | … | … |`.

```markdown
# Status — <project name>

## Blocked

| ID  | Title | Why blocked |
| --- | ----- | ----------- |
| …   | …     | …           |

## Review ready

| ID  | Title | PR       |
| --- | ----- | -------- |
| …   | …     | #N (url) |

## Out of scope

| Item | Source                     | Note |
| ---- | -------------------------- | ---- |
| …    | Parked / Non-Goal / Future | …    |

## Out of radar

| ID  | Title | Reason                                                                       |
| --- | ----- | ---------------------------------------------------------------------------- |
| …   | …     | No roadmap link / Outside project / Stale / PR unmatched / Missing in Linear |

## Focus now

| Field   | Recommendation |
| ------- | -------------- |
| Focus   | …              |
| Because | …              |
| Also    | …              |
```

Omit the **Also** row when there is no alternate. Do not use an empty header row.

Do not add extra sections or narrative. Do not mutate Linear or GitHub.

## Notes

- This skill is read-only — no `save_issue`, no label changes, no audit comments. Mutating rites post audit comments after each write; see `/rites-of-cleaning`, `/rites-of-roadmap`, `/rites-of-review`, and `/rites-of-creation`.
- **Out of scope** = deliberate deferrals and future sequenced work. **Out of radar** = untracked or disconnected work that may need linking or cleanup.
- When Linear and roadmap disagree on blocked status, report both signals in the **Why blocked** column.
- Re-run anytime; output should fit on one screen.

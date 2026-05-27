---
name: litanies-of-status-query
description: Produces a short status report from Linear and roadmap context — blocked issues, review-ready issues, out-of-scope items, and a focus recommendation. Use when the user says "litanies of status query", "project status", "what should we focus on", "what's blocked", "status report", or similar.
disable-model-invocation: true
---

# litanies-of-status-query

Read-only. Gathers Linear issues, GitHub PRs, and foundation docs, then prints a **short** report (bullets, not tables). Target length: under 40 lines total.

## Step 0 — Gather context

Read in parallel:

- `context/foundation/roadmap.md` — frontmatter (`project:`, `main_goal`, `top_blocker`), `## At a glance`, `## North star`, `## Backlog Handoff`, `## Parked`, every item's **Prerequisites**, **Blockers**, **Status**
- `context/foundation/prd.md` — `## Non-Goals` only

Call `list_teams`. Pick the team matching roadmap `project:`, or the only team.

Call `list_projects` with `query: <project name>` when a project exists.

Paginate `list_issues` (`team`, optional `project`, `limit: 250`) for all non-canceled issues.

For issues that may be blocked or review-ready, call `get_issue` with `includeRelations: true` on a focused subset (active slice/foundation issues + any with PR links), not every issue.

Fetch open PRs when `gh` is available:

```bash
gh pr list --repo <owner>/<repo> --state open --limit 50 \
  --json number,title,url,reviewDecision,isDraft
```

Fallback: `list_diffs` with `status: open`.

Build a roadmap index: `change-id` / Roadmap ID → Linear issue (from `**Roadmap ID:**` and `**Change ID:**` in descriptions).

## Step 1 — Classify blocked

An issue is **blocked** when any of:

1. Linear `blockedBy` relations exist (`get_issue` relations)
2. Roadmap **Blockers:** field is non-empty (`—` means none)
3. Roadmap **Status:** is `blocked`
4. A prerequisite roadmap item is not **Done** in Linear (state type completed) — e.g. S-01 blocked while F-01 is open
5. Linear workflow state name contains "Blocked" (case-insensitive)

List each blocked issue as one bullet: `ID — title — why blocked (one phrase)`.

If none: `None.`

## Step 2 — Classify review-ready

An issue is **review-ready** when any of:

1. An **open, non-draft** GitHub PR is linked to it (issue links or matched by change-id branch)
2. Linear state is `In Review` / `Review` (team-specific name)
3. `list_diffs` shows an open diff tied to the issue

List each as one bullet: `ID — title — PR #N (url)`.

If none: `None.`

## Step 3 — Out of scope

Combine two sources — dedupe by name:

**From docs** — every bullet under roadmap `## Parked` and PRD `## Non-Goals` (title only, no long rationale).

**From backlog** — roadmap items whose prerequisites are not yet satisfied **and** that item is not the next unblocked item in dependency order (future work). One bullet each: `Roadmap ID — outcome — waits on <prereq>`.

Linear issues with no Roadmap ID that don't match any active change-id → `Unscoped: ID — title`.

If a section would be empty, write `None.`

## Step 4 — Focus now

Pick **one** primary recommendation plus up to two alternates. Reason using, in order:

1. Roadmap `## Backlog Handoff` — first row where "Ready for `/10x-plan`" is `yes` and prerequisites are done
2. Roadmap `main_goal` and `top_blocker` frontmatter — prefer unblocking the top blocker or advancing the north star
3. **Review-ready** items trump new work — merge/review open PRs first when present
4. Dependency order — never recommend a slice whose prerequisites aren't done

Format:

```
**Focus:** <one sentence — specific issue or action>
**Because:** <one sentence — ties to north star, blocker, or open PR>
**Also:** <optional second item, or omit>
```

## Step 5 — Report

Use this exact structure. Keep each section to ≤6 bullets; truncate with "+ N more" if needed.

```markdown
# Status — <project name>

## Blocked
- …

## Review ready
- …

## Out of scope
- …

## Focus now
**Focus:** …
**Because:** …
**Also:** …
```

Do not add extra sections, tables, or narrative. Do not mutate Linear or GitHub.

## Notes

- This skill is read-only — no `save_issue`, no label changes.
- When Linear and roadmap disagree on blocked status, report both signals in the "why blocked" phrase.
- Re-run anytime; output should fit on one screen.

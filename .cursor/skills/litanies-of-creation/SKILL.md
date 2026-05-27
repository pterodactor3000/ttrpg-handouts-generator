---
name: litanies-of-creation
description: Creates a Linear project from context/foundation/prd.md and context/foundation/roadmap.md — maps PRD name/vision/deadline to the project, and roadmap streams to milestones. Use when the user says "litanies of creation", "create a Linear project", "set up the project in Linear", "add project to Linear", or "create Linear project from context".
disable-model-invocation: true
---

# litanies-of-creation

Creates one Linear project from the current `context/foundation/` artifacts, then adds one milestone per roadmap stream.

## Step 1 — Read source files

Read both files in parallel:

- `context/foundation/prd.md` — extract: `project`, `timeline_budget.hard_deadline`, `created`, `## Vision & Problem Statement`
- `context/foundation/roadmap.md` — extract: `main_goal`, `top_blocker`, every row from `## Streams` (columns: Stream, Theme, Chain, Note)

## Step 2 — Discover workspace

Call `list_teams` and `list_projects` (with `query: <prd project name>`) in parallel.

- Pick the team that matches the PRD `project:` field, or the only team if there is one.
- If a project with the same name already exists, **stop and report** the URL — do not duplicate.

## Step 3 — Create the project

Call `save_project` with:

| Field | Value |
|---|---|
| `name` | PRD `project:` frontmatter |
| `summary` | First sentence of `## Vision & Problem Statement` (max 255 chars) |
| `description` | See template below |
| `startDate` | PRD `created:` date (ISO YYYY-MM-DD) |
| `targetDate` | PRD `timeline_budget.hard_deadline` (ISO YYYY-MM-DD) |
| `targetDateResolution` | `"month"` |
| `setTeams` | `[<team name or id>]` |
| `priority` | `2` (High) |

**Description template** (use literal newlines):

```
## Vision

<full ## Vision & Problem Statement from PRD>

## Sequencing

**Main goal:** <main_goal> — <one-line consequence for the sequence>
**Top blocker:** <top_blocker>

## Hard deadline

<hard_deadline> (after-hours MVP)
```

## Step 4 — Create milestones

For each row in the roadmap `## Streams` table, call `save_milestone` with:

| Field | Value |
|---|---|
| `project` | The project name or ID returned in Step 3 |
| `name` | Stream Theme (e.g. "Core value proof") |
| `description` | Chain + Note from the Streams table |
| `targetDate` | `hard_deadline` for the **last** stream in the chain only; omit for earlier streams (no time estimates in the roadmap) |

Call all `save_milestone` calls in parallel.

## Step 5 — Report

```
Project created: <name>
URL: <url>

Milestones:
  - <Theme> (targetDate: <date or unset>)
  - ...

Next: run /litanies-of-roadmap to populate the project with issues.
```

## Notes

- The MCP server requires literal newlines in markdown fields — no `\n` escape sequences.
- If `list_teams` returns multiple teams and none matches the PRD `project:` name, ask the user before creating.
- Do not set `targetDate` on intermediate stream milestones — the roadmap carries no time estimates and a wrong date is worse than no date.

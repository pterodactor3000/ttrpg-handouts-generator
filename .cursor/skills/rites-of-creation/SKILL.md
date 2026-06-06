---
name: rites-of-creation
description: Creates a Linear project from context/foundation/prd.md and context/foundation/roadmap.md — maps PRD name/vision/deadline to the project, and roadmap streams to milestones. Use when the user says "rites of creation", "create a Linear project", "set up the project in Linear", "add project to Linear", or "create Linear project from context".
disable-model-invocation: true
---

# rites-of-creation

Creates one Linear project from the current `context/foundation/` artifacts, then adds one milestone per roadmap stream. **Interactive and approval-gated** — read and plan first, mutate only after the user explicitly approves the preview.

## Audit comments (after every write)

After **each** successful mutation to a Linear project or milestone, post an audit comment on that entity **and** the identical body on GitHub when a PR is linked or matched to work under that project.

### Format

```
// [<who>] // ::RITES OF CREATION:: // <when> //
<what changed; why>
```

- **`<who>`** — approving user's Linear display name when known, otherwise `cogitator`
- **`<when>`** — ISO 8601 UTC timestamp, e.g. `2026-05-28T14:30:00Z`
- Body line — fields changed (old → new when relevant) and reason (e.g. "created project from PRD on user approval")

### Linear

Immediately after each successful `save_project` or `save_milestone`, call `save_comment` with `projectId` or `milestoneId` set to the mutated entity and `body` set to the audit comment.

### GitHub

When a PR is in scope for the created project (linked issue or open PR on the repo), post the **same** body:

```bash
gh pr comment <number> --repo <owner>/<repo> --body "$(cat <<'EOF'
// [<who>] // ::RITES OF CREATION:: // <when> //
<what changed; why>
EOF
)"
```

Skip GitHub when no PR is associated. Project and milestone creation typically has no PR yet — Linear comment only in that case.

## Approval rules

1. **No silent mutations.** Do not call `save_project` or `save_milestone` until the user has approved Step 3's preview.
2. **Wait for step-specific input.** Accept only explicit user instruction — e.g. "approve", "proceed", "create it", or corrections to the preview. Do not infer approval from the original request to run the skill.
3. **Apply corrections.** If the user requests changes in the preview, update the planned payloads, show the revised preview, and wait for approval again before writing.

## Step 1 — Read source files

Read both files in parallel:

- `context/foundation/prd.md` — extract: `project`, `timeline_budget.hard_deadline`, `created`, `## Vision & Problem Statement`
- `context/foundation/roadmap.md` — extract: `main_goal`, `top_blocker`, every row from `## Streams` (columns: Stream, Theme, Chain, Note)

## Step 2 — Discover workspace

Call `list_teams` and `list_projects` (with `query: <prd project name>`) in parallel.

- Pick the team that matches the PRD `project:` field, or the only team if there is one.
- If a project with the same name already exists, **stop and report** the URL — do not duplicate.
- If `list_teams` returns multiple teams and none matches the PRD `project:` name, ask the user which team to use before building the preview.

## Step 3 — Preview (await approval)

Present a short overview and the exact MCP payloads. **Stop here.** Do not call write MCP tools until the user approves.

### Overview

```
## Planned creation

| What | Value |
|------|-------|
| Team | … |
| Project | … |
| Start date | … |
| Target date | … |
| Milestones | N (one per roadmap stream) |
```

One sentence summarizing intent, e.g. "Create project **TTRPG Handouts Generator** on team **Tech Heresy** with 2 stream milestones from the roadmap."

### MCP: `save_project`

Show every field that will be sent:

| Field                  | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| `name`                 | PRD `project:` frontmatter                                        |
| `summary`              | First sentence of `## Vision & Problem Statement` (max 255 chars) |
| `description`          | See template below                                                |
| `startDate`            | PRD `created:` date (ISO YYYY-MM-DD)                              |
| `targetDate`           | PRD `timeline_budget.hard_deadline` (ISO YYYY-MM-DD)              |
| `targetDateResolution` | `"month"`                                                         |
| `setTeams`             | `[<team name or id>]`                                             |
| `priority`             | `2` (High)                                                        |

**Description template** (use literal newlines in the actual MCP call):

```
## Vision

<full ## Vision & Problem Statement from PRD>

## Sequencing

**Main goal:** <main_goal> — <one-line consequence for the sequence>
**Top blocker:** <top_blocker>

## Hard deadline

<hard_deadline> (after-hours MVP)
```

Print the resolved `description` body (or a clearly marked excerpt if very long, with "…" only for vision text beyond ~500 chars).

### MCP: `save_milestone` (× N)

One table row per stream:

| #   | `project`        | `name`       | `description` | `targetDate`              |
| --- | ---------------- | ------------ | ------------- | ------------------------- |
| 1   | `<project name>` | Stream Theme | Chain + Note  | `<hard_deadline>` or omit |

Rules for the preview table:

- `name`: Stream **Theme** (e.g. "Core value proof")
- `description`: **Chain** + **Note** from the Streams table
- `targetDate`: `hard_deadline` for the **last** stream in the chain only; omit for earlier streams

End with: **Awaiting your approval to create the project and milestones.** Proceed only after explicit user confirmation.

## Step 4 — Create the project

After user approval, call `save_project` with the approved payload from Step 3. Post an audit comment on the created project.

## Step 5 — Create milestones

After the project is created, call `save_milestone` for each approved row from Step 3.

Call all `save_milestone` calls in parallel. Post an audit comment on each created milestone.

## Step 6 — Report

```
Project created: <name>
URL: <url>

Milestones:
  - <Theme> (targetDate: <date or unset>)
  - ...

Next: run /rites-of-roadmap to populate the project with issues.
```

## Notes

- The MCP server requires literal newlines in markdown fields — no `\n` escape sequences.
- Do not set `targetDate` on intermediate stream milestones — the roadmap carries no time estimates and a wrong date is worse than no date.
- The user's initial request to run this skill is **not** blanket approval — Step 3 requires its own explicit input.
- Every `save_project` and `save_milestone` must be followed by an audit comment on Linear — see **Audit comments** above.

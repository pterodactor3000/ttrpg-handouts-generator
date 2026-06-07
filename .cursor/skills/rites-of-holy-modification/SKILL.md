---
name: rites-of-holy-modification
description: Adds a new vertical slice (S-NN) to context/foundation/roadmap.md via a short acceptance-criteria interview, then creates the matching Linear issue. Use when the user says "rites of holy modification", "add feature to roadmap", "add slice to roadmap", "new roadmap item", "add S-NN", or wants to define acceptance criteria before sequencing work.
disable-model-invocation: true
---

# rites-of-holy-modification

Adds one **S-NN slice** to `context/foundation/roadmap.md` and creates its Linear issue. **Interactive and approval-gated** — interview first, preview the draft, mutate only after explicit approval.

Does **not** add F-NN foundations or edit `prd.md`. Does **not** replace `/10x-roadmap` (full decomposition) or `/rites-of-roadmap` (bulk sync).

## Audit comments (after every write)

After **each** successful mutation (roadmap file edit counts as one write; each Linear `save_issue` / `save_comment` counts separately), post an audit comment on the Linear issue. Post the same body on GitHub only when a PR is already linked to that issue.

### Format

```
// [<who>] // ::RITES OF HOLY MODIFICATION:: // <when> //
<what changed; why>
```

- **`<who>`** — approving user's Linear display name when known, otherwise `cogitator`
- **`<when>`** — ISO 8601 UTC timestamp, e.g. `2026-06-07T14:30:00Z`
- Body line — slice id, change-id, fields written, and reason (e.g. "added S-09 delete-handout-confirm to roadmap + Linear on user approval")

### Linear

After each successful `save_issue`, call `save_comment` with `issueId` set to the mutated issue and `body` set to the audit comment.

### GitHub

Skip GitHub unless a PR is already linked to the issue at write time.

## Approval rules

1. **No silent mutations.** Do not edit `roadmap.md` or call Linear write tools until Step 4's preview is explicitly approved.
2. **Wait for step-specific input.** Accept only explicit user instruction — e.g. "approve", "proceed", "add it", or corrections. Do not infer approval from the original request to run the skill.
3. **Apply corrections.** If the user requests changes, update the draft, show the revised preview, and wait for approval again before writing.

## Interactive prompts — host-agnostic

When the procedure says *"ask the user"*, use `AskQuestion` in Cursor, or the host's equivalent structured-question tool. If none exists, ask in plain chat with labelled options. State which tool you use the first time.

## Step 0 — Read context

Read in parallel:

- `context/foundation/roadmap.md` — full file: frontmatter, `## At a glance`, `## Streams`, `## Slices`, `## Backlog Handoff`, `## Parked`
- `context/foundation/prd.md` — `## Functional Requirements`, `## Non-Functional Requirements`, `## Non-Goals` only

Derive:

- **Next slice ID** — highest `S-NN` in the file + 1 (e.g. last is `S-08` → `S-09`)
- **Prerequisite candidates** — every `F-NN` / `S-NN` with `Status: done` in At a glance, plus `—` (none)
- **Parallel candidates** — slices sharing the same prerequisite chain as the new item will likely join
- **PRD ref candidates** — list existing `FR-NNN` ids with one-line summaries; flag if the feature sounds like a Non-Goal or Parked item

Call `list_teams`, `list_issue_labels`, and `list_issues` (`limit: 250`, scoped to the team matching roadmap `project:`) in parallel. Index existing issues by **Change ID** and **Roadmap ID** to prevent duplicates.

If the user's opening message already names the feature, treat it as the seed for Q1; still run the full interview unless every answer is already unambiguous in their message.

## Step 1 — Acceptance-criteria interview

Ask **one question at a time**. Cap at **6 questions**; skip any whose answer is already clear from context.

| # | Topic | Question (adapt wording) | Maps to |
|---|-------|--------------------------|---------|
| 1 | Outcome | Who is the actor (GM / player / visitor)? What can they do end-to-end in one sentence? | `Outcome`, issue `title` |
| 2 | Done when | List 2–5 concrete acceptance criteria — observable behaviors, not implementation. | `Outcome` detail, `Unknowns` if gaps remain |
| 3 | Out of scope | What must this slice **not** do? (flows, screens, data changes) | `Risk`, scope cap in Outcome |
| 4 | Prerequisites | Which roadmap items must be **done** before this slice? Offer top 3 candidates + `— (none)`. | `Prerequisites`, `Status`, Backlog Handoff |
| 5 | Change ID | Propose a kebab-case `change-id` (≤4 words). User confirms or overrides. | `Change ID`, folder name for `/10x-plan` |
| 6 | PRD refs | Which existing `FR-NNN` / NFR labels apply? Offer matches from Step 0; allow `TBD — add FR in separate PRD edit`. | `PRD refs` field |

After Q6, synthesize a one-paragraph recap (plain markdown, no new question) and confirm the user is ready for the draft preview. If they correct anything, update the synthesis before Step 2.

## Step 2 — Draft the slice

Build the full slice payload without writing files.

### Outcome (title)

Format: `<Actor> can <verb> …` — match existing slice tone (see S-02–S-08 in roadmap). Keep the At a glance column under ~120 chars; full Outcome lives in the slice block.

### Status

- **`ready`** — every listed prerequisite has `Status: done` in At a glance
- **`proposed`** — any prerequisite is not done
- **`blocked`** — user named an external blocker (rare; set `Blockers:` field)

### Parallel with

Other slices with the **same** prerequisite set that are not prerequisites of each other. Use `—` when none.

### Risk

One paragraph: blast radius, dependency on prior slices, correctness constraints from PRD Business Logic or NFRs. No implementation picks (frameworks, file paths).

### Unknowns

Bullets only for decisions still open after the interview. Format: `- <question> — Owner: user. Block: yes/no.`

### Backlog Handoff row

| Ready for `/10x-plan` | Notes |
|-----------------------|-------|
| `yes` if status is `ready`, else `no` | `Depends on <prereqs>; run \`/10x-plan <change-id>\`` |

### Streams table

If the new slice joins an existing stream's chain, note which stream letter and updated chain string. If it starts a new dependency branch, propose a new stream row — include in preview only.

### Frontmatter changelog

Plan a comment line: `# <YYYY-MM-DD>: <S-NN> <change-id> — <short reason>`. Bump `updated:` to today.

## Step 3 — Plan Linear payload

Reuse the issue template from `/rites-of-roadmap`:

```
**Roadmap ID:** S-NN | **Change ID:** `<change-id>`

## PRD refs

<PRD refs field verbatim>

## Prerequisites

<Prerequisites field verbatim, or "— (none; first item in dependency order)">

## Risk

<Risk field verbatim>
```

- **Labels:** `["slice"]` — create the `slice` label via `create_issue_label` if missing (same spec as `/rites-of-roadmap`)
- **Blocking:** plan `save_issue` on each **direct** prerequisite issue with `blocks: [<new-issue-id>]` after create
- **Duplicate guard:** if Change ID or Roadmap ID already exists in Linear, mark `skip create` and report in preview

## Step 4 — Preview (await approval)

Present the draft. **Stop here.** Do not edit files or call Linear write tools until approved.

```markdown
## Planned slice — S-NN: <short name>

| Field | Value |
|-------|-------|
| Roadmap ID | S-NN |
| Change ID | `<change-id>` |
| Status | ready / proposed / blocked |
| Prerequisites | … |
| Parallel with | … |
| Ready for `/10x-plan` | yes / no |

### Outcome
<full Outcome>

### Acceptance criteria
- …
- …

### Out of scope
- …

### PRD refs
…

### Risk
…

### Unknowns
… (or "—")

### Roadmap edits
- Frontmatter: `updated`, changelog comment
- `## At a glance`: new row
- `## Slices`: new `### S-NN` block
- `## Backlog Handoff`: new row
- `## Streams`: <no change | updated chain | new row>

### Linear
| Action | Title | Labels | Prerequisite blocks |
|--------|-------|--------|---------------------|
| create / skip | … | slice | F-01 → S-NN, … |
```

End with: **Awaiting your approval to write the roadmap and create the Linear issue.** Proceed only after explicit user confirmation.

## Step 5 — Write roadmap

After approval, edit `context/foundation/roadmap.md` in one pass:

1. Frontmatter — `updated:` + changelog comment
2. `## At a glance` — append row (match column order)
3. `## Slices` — append `### S-NN` block with all fields (`Outcome`, `Change ID`, `PRD refs`, `Prerequisites`, `Parallel with`, `Blockers`, `Unknowns`, `Risk`, `Status`)
4. `## Backlog Handoff` — append row
5. `## Streams` — update only when approved in preview

Preserve existing formatting, table alignment, and comment style. Do not reorder existing slices.

## Step 6 — Create Linear issue

After the roadmap write:

1. Create missing labels if planned (`create_issue_label` for `slice` if needed)
2. `save_issue` — new slice issue with title = Outcome, team, labels, description
3. Post audit comment on the created issue
4. For each direct prerequisite, `save_issue` with `blocks: [<new-linear-id>]`; audit comment each updated prerequisite
5. If duplicate was detected, skip create and note which existing issue matches

Run independent creates in parallel; run blocking updates after the new issue id is known.

## Step 7 — Report

```markdown
## rites-of-holy-modification — complete

| Artifact | Result |
|----------|--------|
| Roadmap | S-NN `<change-id>` added to `context/foundation/roadmap.md` |
| Linear | TEC-N created (or skipped — already exists) |
| Blocks wired | <prereq ids → new id> |
| Next step | `/10x-plan <change-id>` when Ready = yes |
```

## Notes

- Re-running with the same `change-id` is safe: duplicate guard skips Linear create; do not append a second roadmap row — offer to edit the existing slice instead.
- If the feature belongs in `## Parked` or PRD Non-Goals, say so in Step 1 and stop — do not add the slice without explicit user override.
- String values to Linear MCP: real newlines in markdown, no `\n` escape sequences.
- The user's initial request to run this skill is **not** blanket approval for Steps 5–6.

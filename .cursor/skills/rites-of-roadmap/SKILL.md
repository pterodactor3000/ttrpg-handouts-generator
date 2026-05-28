---
name: rites-of-roadmap
description: Syncs context/foundation/roadmap.md to Linear via MCP — creates one issue per F-NN (foundation) and S-NN (slice) item, with Outcome as the title, PRD refs + prerequisites + risk as the description, and foundation/slice/north-star labels applied. Wires blocking relations to mirror the dependency graph. Use when the user says "rites of roadmap", "move roadmap to Linear", "sync roadmap to Linear", "create Linear issues from roadmap", "push roadmap to Linear", or similar.
disable-model-invocation: true
---

# rites-of-roadmap

Reads `context/foundation/roadmap.md` and creates one Linear issue per roadmap item (F-NN foundations + S-NN slices), then wires the `blocks` dependency graph. **Interactive and approval-gated** — read and plan first, mutate only after the user explicitly approves the preview.

## Audit comments (after every write)

After **each** successful mutation to a Linear issue, post an audit comment on that issue **and** the identical body on GitHub when a PR is linked or matched to that issue.

### Format

```
// [<who>] // ::RITES OF ROADMAP:: // <when> //
<what changed; why>
```

- **`<who>`** — approving user's Linear display name when known, otherwise `cogitator`
- **`<when>`** — ISO 8601 UTC timestamp, e.g. `2026-05-28T14:30:00Z`
- Body line — fields changed (old → new when relevant) and reason (e.g. "created from roadmap F-01 on user approval")

### Linear

Immediately after each successful `save_issue`, call `save_comment` with `issueId` set to the mutated issue and `body` set to the audit comment. Batch comment calls in parallel when multiple issues were updated in the same step.

### GitHub

When the issue has a linked PR or a PR matches by change-id / branch, post the **same** body:

```bash
gh pr comment <number> --repo <owner>/<repo> --body "$(cat <<'EOF'
// [<who>] // ::RITES OF ROADMAP:: // <when> //
<what changed; why>
EOF
)"
```

Skip GitHub when no PR is associated with that issue. Label-only creates (`create_issue_label`) do not get audit comments.

## Approval rules

1. **No silent mutations.** Do not call `create_issue_label` or `save_issue` until the user has approved Step 4's preview.
2. **Wait for step-specific input.** Accept only explicit user instruction — e.g. "approve", "proceed", "create it", or corrections. Do not infer approval from the original request to run the skill.
3. **Apply corrections.** If the user requests changes, update the planned payloads, show the revised preview, and wait for approval again before writing.

## Step 1 — Read the roadmap

Read `context/foundation/roadmap.md` in full. Extract:

- Every `F-NN` block from `## Foundations` — note Outcome, Change ID, PRD refs, Prerequisites, Unlocks, Risk
- Every `S-NN` block from `## Slices` — note Outcome, Change ID, PRD refs, Prerequisites, Parallel with, Risk
- The north-star slice ID from `## North star` (format: `**S-NN: …**`)

## Step 2 — Discover workspace

Call `list_teams`, `list_issue_labels`, and `list_issues` (scoped to the matched team, `limit: 250`) in parallel.

- Pick the team that matches the roadmap `project:` frontmatter field, or the only team if there is just one.
- If `list_teams` returns multiple teams and none matches the roadmap `project:` field, ask the user which team before building the preview.
- Note which of `foundation`, `slice`, `north-star` already exist by name.
- Index existing issues by **Change ID** (from `**Change ID:**` in description) and by **Roadmap ID** (from `**Roadmap ID:**`). Use these to detect duplicates.

## Step 3 — Plan payloads

Build the full create plan without calling write MCP tools.

### Issue title

The `Outcome` field verbatim (including the `(foundation)` prefix for F-NN items).

### Issue labels

- F-NN → `["foundation"]`
- S-NN that is the north star → `["slice", "north-star"]`
- all other S-NN → `["slice"]`

### Issue description template

Use literal newlines, no escape sequences per MCP server instructions:

```
**Roadmap ID:** <F-NN or S-NN> | **Change ID:** `<change-id>`

<For the north star only: "This is the **north star** — the smallest end-to-end slice that proves the core product hypothesis.">

## PRD refs

<PRD refs field verbatim>

## Prerequisites

<Prerequisites field verbatim, or "— (none; first item in dependency order)" for items with no prerequisites>

## Risk

<Risk field verbatim>

<For F-NN only: "## Unlocks\n\n<Unlocks field verbatim>">
```

### Blocking relations

For each item whose `Prerequisites` field lists one or more roadmap IDs, plan `save_issue` on the **prerequisite** issue with `blocks: [<downstream-linear-id>, ...]`. Only wire direct prerequisites — not transitive relations. Use existing Linear IDs for prerequisites that already exist; use planned placeholder IDs (roadmap ID → "new") for issues being created in the same batch.

S-03 / S-04 type siblings (same Prerequisites, parallel-with each other) both get `blocks` wired from their shared prerequisite — no relation between the siblings themselves.

### Labels to create

For any of `foundation`, `slice`, `north-star` that don't exist, plan `create_issue_label`:

| Label | Color | Description |
|---|---|---|
| `foundation` | `#6366F1` | Cross-cutting prerequisite that unlocks vertical slices but has no user-visible outcome on its own |
| `slice` | `#26A69A` | Vertical, end-to-end user-visible capability from the roadmap |
| `north-star` | `#F59E0B` | The north-star slice — smallest end-to-end flow that proves the core product hypothesis |

## Step 4 — Preview (await approval)

Present the planned sync. **Stop here.** Do not call write MCP tools until the user approves.

### Overview

```
## Planned roadmap sync

| What | Count |
|------|-------|
| Team | … |
| Roadmap items | N (F-NN + S-NN) |
| Issues to create | … |
| Issues skipped (already exist) | … |
| Labels to create | … |
| Blocking relations to wire | … |
```

One sentence summarizing intent, e.g. "Create 5 issues from roadmap F-01–S-04 on team **Tech Heresy** and wire the dependency graph."

### Roadmap ↔ Linear comparison

One row per roadmap item:

| Roadmap ID | Change ID | Outcome (title) | Existing Linear | Action |
|------------|-----------|-----------------|-----------------|--------|
| F-01 | `handout-schema` | … | TEC-6 or — | create / skip |
| S-01 | `first-handout-…` | … | — | create |
| … | … | … | … | … |

- **Existing Linear**: matched issue ID + state, or `—` if none
- **Action**: `create` for new issues; `skip` when a matching Change ID or Roadmap ID already exists (report "already exists" — do not duplicate)

### MCP: `create_issue_label` (if any)

| Label | Color | Description |
|-------|-------|-------------|
| … | … | … |

Omit this section if all three labels already exist.

### MCP: `save_issue` — new issues

One subsection per issue to create. Show every field:

| Field | Value |
|-------|-------|
| `title` | … |
| `team` | … |
| `labels` | … |
| `description` | (resolved body — excerpt OK if >500 chars, mark with `…`) |

Or use a compact table when payloads are uniform:

| Roadmap ID | `title` | `team` | `labels` |
|------------|---------|--------|----------|
| F-01 | … | … | `["foundation"]` |

Always show the full `description` for at least the north-star issue; others may use excerpt + "see template".

### MCP: `save_issue` — blocking relations

| Prerequisite issue | `blocks` | Roadmap edge |
|--------------------|----------|--------------|
| TEC-6 (F-01) | [TEC-5] | F-01 → S-01 |
| … | … | … |

Use planned Linear IDs returned from creation order only in the execution step — in preview, reference roadmap IDs in the edge column and note "Linear IDs assigned on create".

End with: **Awaiting your approval to create issues, labels, and wire blocking relations.** Proceed only after explicit user confirmation.

## Step 5 — Create missing labels

After user approval, call `create_issue_label` for any approved labels. Create all in parallel.

## Step 6 — Create issues (parallel)

Create all approved F-NN and S-NN issues in a single parallel batch via `save_issue`. Skip items marked `skip` in the preview. Post an audit comment on each created issue (and on any linked GitHub PR).

Collect every returned `id` (e.g. `TEC-6`) and map it to its roadmap ID (e.g. `F-01`). Merge with existing issue IDs for prerequisite resolution.

## Step 7 — Wire blocking relations (parallel)

For each approved blocking relation, call `save_issue` with `blocks: [<downstream-linear-id>, ...]` on the prerequisite issue.

Run all update calls in parallel. Post an audit comment on each prerequisite issue whose `blocks` were updated (and on any linked GitHub PR).

## Step 8 — Report

Print a summary table:

```
| Linear ID | Roadmap ID | Labels | Status |
|-----------|------------|--------|--------|
| TEC-6     | F-01       | foundation | created / already exists |
| TEC-5     | S-01       | slice, north-star | created |
...

Blocking graph wired: <concise chain, e.g. TEC-6 → TEC-5 → TEC-7 → TEC-8 / TEC-9>
```

## Notes

- The MCP server instruction says: pass string values without escape sequences — use real newlines in markdown content, not `\n`.
- The user's initial request to run this skill is **not** blanket approval — Step 4 requires its own explicit input.
- Re-running is safe: existing Change ID / Roadmap ID matches are skipped, not duplicated.
- Every `save_issue` must be followed by an audit comment on Linear (and GitHub when a PR is linked) — see **Audit comments** above.

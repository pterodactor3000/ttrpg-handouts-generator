---
name: litanies-of-roadmap
description: Syncs context/foundation/roadmap.md to Linear via MCP — creates one issue per F-NN (foundation) and S-NN (slice) item, with Outcome as the title, PRD refs + prerequisites + risk as the description, and foundation/slice/north-star labels applied. Wires blocking relations to mirror the dependency graph. Use when the user says "litanies of roadmap", "move roadmap to Linear", "sync roadmap to Linear", "create Linear issues from roadmap", "push roadmap to Linear", or similar.
disable-model-invocation: true
---

# litanies-of-roadmap

Reads `context/foundation/roadmap.md` and creates one Linear issue per roadmap item (F-NN foundations + S-NN slices), then wires the `blocks` dependency graph.

## Process

### Step 1 — Read the roadmap

Read `context/foundation/roadmap.md` in full. Extract:

- Every `F-NN` block from `## Foundations` — note Outcome, Change ID, PRD refs, Prerequisites, Unlocks, Risk
- Every `S-NN` block from `## Slices` — note Outcome, Change ID, PRD refs, Prerequisites, Parallel with, Risk
- The north-star slice ID from `## North star` (format: `**S-NN: …**`)

### Step 2 — Discover workspace

Call `list_teams` (no arguments). Pick the team that matches the roadmap `project:` frontmatter field, or the only team if there is just one.

Call `list_issue_labels` (no arguments). Note which of `foundation`, `slice`, `north-star` already exist by name.

### Step 3 — Create missing labels

For any of the three labels that don't yet exist, call `create_issue_label`. Create all missing labels in parallel.

| Label | Color | Description |
|---|---|---|
| `foundation` | `#6366F1` | Cross-cutting prerequisite that unlocks vertical slices but has no user-visible outcome on its own |
| `slice` | `#26A69A` | Vertical, end-to-end user-visible capability from the roadmap |
| `north-star` | `#F59E0B` | The north-star slice — smallest end-to-end flow that proves the core product hypothesis |

### Step 4 — Create issues (parallel)

Create all F-NN and S-NN issues in a single parallel batch. For each item:

**Title** — the `Outcome` field verbatim (including the `(foundation)` prefix for F-NN items).

**Labels:**
- F-NN → `["foundation"]`
- S-NN that is the north star → `["slice", "north-star"]`
- all other S-NN → `["slice"]`

**Description** — use this template (literal newlines, no escape sequences per MCP server instructions):

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

**team** — the team name or ID found in Step 2.

Collect every returned `id` (e.g. `TEC-6`) and map it to its roadmap ID (e.g. `F-01`).

### Step 5 — Wire blocking relations (parallel)

For each item whose `Prerequisites` field lists one or more roadmap IDs, translate those roadmap IDs to the Linear issue IDs you collected in Step 4, then call `save_issue` with `blocks: [<downstream-linear-id>, ...]` on the **prerequisite** issue.

Only wire direct prerequisites — do not add transitive relations.

Run all `save_issue` update calls in parallel.

### Step 6 — Report

Print a summary table:

```
| Linear ID | Roadmap ID | Labels | Status |
|-----------|------------|--------|--------|
| TEC-6     | F-01       | foundation | created |
| TEC-5     | S-01       | slice, north-star | created |
...

Blocking graph wired: <concise chain, e.g. TEC-6 → TEC-5 → TEC-7 → TEC-8 / TEC-9>
```

## Notes

- The MCP server instruction says: pass string values without escape sequences — use real newlines in markdown content, not `\n`.
- If `list_teams` returns multiple teams and none matches the roadmap `project:` field, ask the user which team before proceeding.
- If an issue for a given `change-id` already exists (detectable by searching existing issues), skip creation and report "already exists" in the summary rather than duplicating.
- S-03 / S-04 type siblings (same Prerequisites, parallel-with each other) both get `blocks` wired from their shared prerequisite — no relation between the siblings themselves.

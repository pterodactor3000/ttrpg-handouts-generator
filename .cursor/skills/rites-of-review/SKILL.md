---
name: rites-of-review
description: Syncs GitHub pull requests to Linear via MCP — attaches PR links to matching issues and connects work items to the correct roadmap slice (labels, milestone, parent). Use when the user says "rites of review", "link PRs to Linear", "update Linear with PR links", "connect issues to slices", or similar.
disable-model-invocation: true
---

# rites-of-review

Reads open and recently merged GitHub PRs, matches them to Linear issues via roadmap `change-id`s, attaches PR links, and aligns issues with their slice (milestone, labels, parent). **Interactive and approval-gated** — read and plan first, mutate only after the user explicitly approves the preview.

## Audit comments (after every write)

After **each** successful mutation to a Linear issue, post an audit comment on that issue **and** the identical body on the matching GitHub PR.

### Format

```
// [<who>] // ::RITES OF REVIEW:: // <when> //
<what changed; why>
```

- **`<who>`** — approving user's Linear display name when known, otherwise `cogitator`
- **`<when>`** — ISO 8601 UTC timestamp, e.g. `2026-05-28T14:30:00Z`
- Body line — fields changed (old → new when relevant) and reason (e.g. "attached PR #12; set milestone to Core value proof")

### Linear

Immediately after each successful `save_issue`, call `save_comment` with `issueId` set to the mutated issue and `body` set to the audit comment. Batch comment calls in parallel when multiple issues were updated in the same step.

### GitHub

For every PR in the approved payload, post the **same** body via:

```bash
gh pr comment <number> --repo <owner>/<repo> --body "$(cat <<'EOF'
// [<who>] // ::RITES OF REVIEW:: // <when> //
<what changed; why>
EOF
)"
```

When one `save_issue` maps to one PR, use one comment body on both platforms. When an issue update has no PR in scope, skip GitHub for that issue only.

## Approval rules

1. **No silent mutations.** Do not call `save_issue` until the user has approved Step 5's preview.
2. **Wait for step-specific input.** Accept only explicit user instruction — e.g. "approve", "proceed", "link them", or corrections. Do not infer approval from the original request to run the skill.
3. **Apply corrections.** If the user requests changes, update the planned payloads, show the revised preview, and wait for approval again before writing.
4. **Conservative matching.** Items under **Needs review** are shown in the preview but excluded from payloads until the user designates the correct issue.

## Step 0 — Scope

Read in parallel:

- `context/foundation/roadmap.md` — full file: frontmatter `project:`, every `F-NN` / `S-NN` block (Roadmap ID, Change ID, Outcome, Prerequisites), `## North star`, `## Streams`
- `context/foundation/prd.md` — frontmatter `project:` (fallback project name)

Parse git remote for GitHub `owner/repo`:

```bash
git remote get-url origin
```

Call `list_teams`. Pick the team matching roadmap/PRD `project:`, or the only team. If ambiguous, ask the user.

Call `list_projects` with `query: <project name>`. Pick the matching project when present.

Call `list_milestones` for that project. Map stream **Theme** names to milestone IDs (from `## Streams`).

## Step 1 — Build roadmap index

From the roadmap, build:

| Key | Value |
|---|---|
| `change-id` (kebab-case) | `{ roadmapId, type: foundation\|slice, outcome, streamTheme?, labels[] }` |
| `roadmapId` (F-NN / S-NN) | Linear issue id (filled in Step 2) |

**Stream → slice mapping** — for each Streams row, parse the Chain column (e.g. `` `F-01` → `S-01` ``). Every roadmap ID in the chain inherits that row's **Theme** as `streamTheme`.

**Labels per roadmap item** (same rules as `/rites-of-roadmap`):

- F-NN → `foundation`
- north-star S-NN → `slice`, `north-star`
- other S-NN → `slice`

## Step 2 — Index Linear slice issues

Paginate `list_issues` (`team`, optional `project`, `limit: 250`) until exhausted.

For each issue, extract from the description:

- **Roadmap ID** — from `**Roadmap ID:** F-NN` or `S-NN`
- **Change ID** — from `` **Change ID:** `change-id` ``

Populate the roadmap index with Linear identifiers. Collect all issues (including those without Roadmap ID) for orphan matching in Step 4.

Call `get_issue` on candidate matches to inspect existing attachments/links before planning updates.

## Step 3 — Fetch GitHub PRs

Primary source — `gh` CLI (requires auth):

```bash
gh pr list --repo <owner>/<repo> --state all --limit 250 \
  --json number,title,url,headRefName,body,state,mergedAt
```

If the user scoped a single PR (`#123` or URL), fetch only that PR via `gh pr view`.

Fallback when `gh` is unavailable: call `list_diffs` with `owner` and `repo` filters, then `get_diff` for details.

## Step 4 — Match and plan (no writes)

For each PR, resolve the target Linear issue using the first match in this order:

1. **Linear identifier in PR** — body or title contains an issue id like `TEC-123` (regex: `[A-Z]+-\d+`)
2. **Change ID in branch** — `headRefName` contains a roadmap `change-id` slug (match longest slug first to avoid partial hits)
3. **Change ID in PR metadata** — title or body contains the slug or `` `change-id` ``
4. **Roadmap ID in branch/metadata** — `S-01`, `F-01`, etc.
5. **Change folder** — `context/changes/<change-id>/` exists and branch or PR title references that folder name
6. **Normalized title** — PR title closely matches a slice issue Outcome (lowercase, strip prefixes like `feat:`, `(foundation)`)

When multiple issues match, prefer the issue whose **Change ID** equals the PR's inferred change-id. If still ambiguous, list under **Needs review** — do not plan an attachment.

**Skip** when the issue already has this PR URL in its links.

### Planned PR links

For each confident match, plan:

```json
{
  "id": "<linear-issue-id>",
  "links": [{ "url": "<pr-url>", "title": "PR #<number>: <title>" }]
}
```

`links` is append-only — safe to re-run.

Optionally plan status move to `In Progress` when the PR is open and the issue is still in `Backlog` / `Todo` (only when the user asked to update status, or the PR is explicitly draft/WIP-free). Include in preview as a separate `state` field on the payload.

### Planned slice connections

For every Linear issue tied to a roadmap item (and orphans matched in Step 4):

**Labels** — merge required slice labels from the roadmap index with existing labels. Plan `save_issue` with the full merged `labels` array when any are missing.

**Milestone** — when `streamTheme` is known and the project has a matching milestone, plan `milestone: <theme name or id>`. Skip if milestone already set.

**Parent (orphan work items)** — an issue is an **orphan** when it has no Roadmap ID in the description but matches a `change-id`. Plan `parentId` to the canonical slice/foundation issue. Prefer the **slice** (S-NN) when the change-id maps to a slice. Skip if `parentId` is already correct.

## Step 5 — Preview (await approval)

Present all planned Linear MCP writes. **Stop here.** Do not call `save_issue` until the user approves.

### Overview

```
## Planned review sync

| What | Count |
|------|-------|
| Team | … |
| Project | … |
| PRs fetched | … |
| PR links to attach | … |
| PR links skipped (already linked) | … |
| Slice label fixes | … |
| Milestones to set | … |
| Parents to wire | … |
| Needs review | … |
```

### PR ↔ Linear comparison

One row per PR with a planned or skipped action:

| PR | Title | Linear issue | Roadmap ID | Match reason | Action |
|----|-------|--------------|------------|--------------|--------|
| #12 | … | TEC-5 | S-01 | change-id in branch | attach |
| #8 | … | TEC-6 | F-01 | change-id in branch | skip (already linked) |
| #99 | … | — | — | ambiguous match | needs review |

### MCP: `save_issue` — PR links

One row per planned attachment:

| `id` | `links` | Optional `state` |
|------|---------|------------------|
| TEC-5 | `[{ "url": "https://github.com/…/pull/12", "title": "PR #12: …" }]` | In Progress (if planned) |

Show the full JSON payload for each row.

### MCP: `save_issue` — slice connections

Only rows where a change is planned:

| `id` | Field | Current | Planned |
|------|-------|---------|---------|
| TEC-5 | `labels` | … | … (merged) |
| TEC-5 | `milestone` | — | Core value proof |
| TEC-14 | `parentId` | — | TEC-5 |

Show the full `save_issue` payload per issue (merge link + slice fields for the same issue into one payload row when both apply).

### Needs review

| PR / Issue | Reason |
|------------|--------|
| … | ambiguous change-id match |

End with: **Awaiting your approval to link PRs and apply slice connections.** Proceed only after explicit user confirmation. If the user resolves ambiguous matches, update the preview and wait for approval again.

## Step 6 — Apply approved changes

After user approval, call `save_issue` for each approved payload. Merge link and slice fields for the same issue into a single call when both apply.

Run updates in parallel where safe. Immediately after each successful write, post the audit comment on the Linear issue and on the matching GitHub PR with identical body.

## Step 7 — Report

```
## PR links attached
| PR | Linear issue | Roadmap ID | Match reason |
|----|--------------|------------|--------------|
| #12 | TEC-5 | S-01 | change-id in branch |

## Slice connections updated
| Issue | Roadmap ID | Labels | Milestone | Parent |
|-------|------------|--------|-----------|--------|
| TEC-5 | S-01 | +north-star | Core value proof | — |
| TEC-14 | — | +slice | Core value proof | TEC-5 |

## Skipped (already linked)
| PR | Linear issue |
|----|--------------|
| …  | …            |

## Needs review
| PR / Issue | Reason |
|------------|--------|
| …          | ambiguous change-id match |

Summary: <N> PR links attached, <N> label fixes, <N> milestones set, <N> parents wired, <N> skipped, <N> need review
```

## Notes

- Pass string values to MCP tools without escape sequences — literal newlines in markdown fields.
- PR → issue matching is conservative; wrong links are worse than missing links.
- This skill does not create issues — run `/rites-of-roadmap` first if slice issues are missing.
- Re-running is idempotent for links, labels, milestones, and parents already correct.
- Merged PRs are included so historical PR links backfill; filter to `--state open` only when the user asks for open PRs.
- The user's initial request to run this skill is **not** blanket approval — Step 5 requires its own explicit input.
- Every `save_issue` must be followed by an audit comment on Linear and on the matching GitHub PR — see **Audit comments** above.

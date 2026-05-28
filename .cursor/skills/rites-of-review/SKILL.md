---
name: rites-of-review
description: Syncs GitHub pull requests to Linear via MCP — attaches PR links to matching issues and connects work items to the correct roadmap slice (labels, milestone, parent). Use when the user says "rites of review", "link PRs to Linear", "update Linear with PR links", "connect issues to slices", or similar.
disable-model-invocation: true
---

# rites-of-review

Reads open and recently merged GitHub PRs, matches them to Linear issues via roadmap `change-id`s, attaches PR links, and aligns issues with their slice (milestone, labels, parent).

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

Populate the roadmap index with Linear identifiers. Collect all issues (including those without Roadmap ID) for orphan matching in Step 5.

## Step 3 — Fetch GitHub PRs

Primary source — `gh` CLI (requires auth):

```bash
gh pr list --repo <owner>/<repo> --state all --limit 250 \
  --json number,title,url,headRefName,body,state,mergedAt
```

If the user scoped a single PR (`#123` or URL), fetch only that PR via `gh pr view`.

Fallback when `gh` is unavailable: call `list_diffs` with `owner` and `repo` filters, then `get_diff` for details.

## Step 4 — Match PRs to issues

For each PR, resolve the target Linear issue using the first match in this order:

1. **Linear identifier in PR** — body or title contains an issue id like `TEC-123` (regex: `[A-Z]+-\d+`)
2. **Change ID in branch** — `headRefName` contains a roadmap `change-id` slug (match longest slug first to avoid partial hits)
3. **Change ID in PR metadata** — title or body contains the slug or `` `change-id` ``
4. **Roadmap ID in branch/metadata** — `S-01`, `F-01`, etc.
5. **Change folder** — `context/changes/<change-id>/` exists and branch or PR title references that folder name
6. **Normalized title** — PR title closely matches a slice issue Outcome (lowercase, strip prefixes like `feat:`, `(foundation)`)

When multiple issues match, prefer the issue whose **Change ID** equals the PR's inferred change-id. If still ambiguous, list under **Needs review** — do not attach.

**Skip** when the issue already has this PR URL in its links (call `get_issue` and inspect attachments/links before updating).

For each confident match, call `save_issue`:

```json
{
  "id": "<linear-issue-id>",
  "links": [{ "url": "<pr-url>", "title": "PR #<number>: <title>" }]
}
```

Run updates in parallel. `links` is append-only — safe to re-run.

Optionally move matched issues to `In Progress` when the PR is open and the issue is still in `Backlog` / `Todo` (only when the user asked to update status, or the PR is explicitly draft/WIP-free).

## Step 5 — Connect issues to proper slices

For every Linear issue tied to a roadmap item (and orphans matched in Step 4):

### 5a — Labels

Merge required slice labels from the roadmap index with existing labels. Call `save_issue` with the full merged `labels` array when any are missing.

### 5b — Milestone

When `streamTheme` is known and the project has a matching milestone, call `save_issue` with `milestone: <theme name or id>`. Skip if milestone already set.

### 5c — Parent (orphan work items)

An issue is an **orphan** when it has no Roadmap ID in the description but matches a `change-id` (from PR branch, PR body, or its own title).

Set `parentId` to the Linear issue for that roadmap item's canonical slice/foundation issue. Prefer the **slice** (S-NN) when the change-id maps to a slice; use foundation (F-NN) only for foundation work.

Skip if `parentId` is already set to the correct parent.

Run all slice-connection updates in parallel.

## Step 6 — Report

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

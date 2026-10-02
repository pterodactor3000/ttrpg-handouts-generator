# Report generator — execution plan

Spec: [`_goal.md`](./_goal.md). This document is the step-by-step runbook for the Cursor agent (or future automation).

---

## Phase 0 — Resolve scope

| Field | Source |
| ----- | ------ |
| `{project-name}` | Repo directory name: `ttrpg-handouts-generator` |
| `{yyyy-mm-dd}` | Today's date (UTC or local — pick one and stay consistent; default local) |
| Linear team | `list_teams` → match `context/foundation/roadmap.md` frontmatter `project:` |
| Linear project | Same string: `TTRPG Handouts Generator` |
| GitHub repo | `git remote get-url origin` → `owner/repo` |

Output path: `docs/reports/ttrpg-handouts-generator-{yyyy-mm-dd}.md`

**Edit rule:** create or overwrite today's file only. Never edit older dated files except to delete them in Phase 4.

---

## Phase 1 — Setup (read-only fetch)

Run in parallel where possible.

### 1.1 Linear issues

```text
MCP user-linear → list_teams
MCP user-linear → list_projects query: "TTRPG Handouts Generator"
MCP user-linear → list_issues team + project limit 250
MCP user-linear → list_issues team only limit 250   # catch out-of-project items
```

For issues in Todo / In Progress / In Review / Blocked, call `get_issue` with `includeRelations: true` on the open set only.

### 1.2 PRs to review

**Primary (MCP, no GitHub token in repo):**

```text
MCP user-linear → list_diffs status: open
```

Include a PR/diff when:

- status is open
- not draft (if field available)
- review is requested on the user, or no reviewer assigned yet, or linked to an open Linear issue

**Fallback (when `gh` is authenticated in the environment):**

```bash
gh pr list --repo <owner>/<repo> --state open --limit 50 \
  --json number,title,url,headRefName,reviewDecision,isDraft,reviewRequests
```

Classify **PRs to review** as open, non-draft PRs where `reviewDecision` is empty/`REVIEW_REQUIRED` or the current user is in `reviewRequests`. Exclude author's own PRs unless explicitly requested.

**De-dupe:** merge Linear diffs and GitHub PRs by URL or branch/`change-id` in `headRefName`.

### 1.3 Existing reports scan

Glob: `docs/reports/{project-name}-*.md`

Parse each file's date from the filename. Build retention candidates (Phase 4).

Extract **tracked IDs** from each candidate file:

| Pattern | Example |
| ------- | ------- |
| Linear issue | `TEC-19`, `[TEC-19](url)` |
| GitHub PR | `#42`, `PR #42`, `pull/42` |

Store per file: `{ path, date, issueIds[], prNumbers[] }`.

### 1.4 Skills

Read for classification and cleanup prompt templates:

- `.cursor/skills/rites-of-status-query/SKILL.md` — blocked, review-ready, PR matching
- `.cursor/skills/rites-of-cleaning/SKILL.md` — hygiene actions (approval-gated; report only)

---

## Phase 2 — Retention pre-check (inform today's report)

For each report file where `fileDate < today - 7 days`:

1. Reconcile tracked issue IDs against current Linear state from Phase 1.
   - **Resolved:** `statusType` is `completed`, `canceled`, or label `duplicate`.
   - **Unresolved:** any other active state.
2. Reconcile tracked PR numbers against open PR set from Phase 1.
   - **Resolved:** merged or closed.
   - **Unresolved:** still open.
3. Mark file:
   - **DELETE** — all tracked items resolved
   - **KEEP** — at least one unresolved item (note which id blocks deletion)

Do not delete yet; record intent for Phase 4 and summarize in today's **Retention** section.

---

## Phase 3 — Write today's report

Template sections (required):

### Summary

Counts: total / open / done / canceled issues; hygiene gaps; **open PRs awaiting review**.

### PRs to review

| PR | Title | Linear | Review state | Action |
| -- | ----- | ------ | ------------ | ------ |

If none: `| — | None | — | — | — |`

**Proposed review actions (copy-paste for agent):**

```text
Review PR #N: read diff, run CI checks locally if needed, gh pr review N --comment --body "..." or approve/request-changes. Link findings to Linear issue TEC-XX if applicable.
```

```json
// Optional MCP — read only
// user-linear → get_diff { "id": "<diff-id>" }
```

```bash
gh pr view <N> --repo <owner>/<repo>
gh pr checks <N> --repo <owner>/<repo>
gh pr review <N> --repo <owner>/<repo> --approve   # only after human approval
```

### Open issues

Same table as current report (Todo rows with roadmap id, labels, assignee, priority).

### Hygiene issues

Subsections: missing owner, missing AC, no priority, stale (14d), blocked, roadmap drift.

Pull stale threshold and AC detection rules from `rites-of-cleaning`.

### Proposed cleanup actions

Unchanged pattern: agent prompts + `save_issue` / `get_issue` JSON examples. **No writes during report run.**

Add **Action G — PR review queue** when PRs to review is non-empty:

```text
For each open PR in the PRs to review section, run /rites-of-review or summarize diff scope and CI status. Do not merge without approval.
```

### Retention

| File | Age | Decision | Reason |
| ---- | --- | -------- | ------ |

Example keep: `ttrpg-handouts-generator-2026-06-22.md` — KEEP — TEC-19 still Todo  
Example delete: `ttrpg-handouts-generator-2026-06-15.md` — DELETE — all tracked issues Done

### Skills reference

Link rites-of-cleaning, rites-of-status-query, rites-of-review if present.

Footer: `*Generated read-only. No Linear or GitHub mutations were performed during this report.*`

---

## Phase 4 — Retention execute

After today's report is written:

```text
For each file marked DELETE in Phase 2:
  - remove docs/reports/{project-name}-{date}.md from repo
For each file marked KEEP:
  - leave in place; reason already in today's Retention table
```

**Constraints:**

- Never delete today's file.
- Never delete `_goal.md`, `_plan.md`, `README.md`.
- If unsure whether an issue is resolved, KEEP (conservative).

---

## Phase 5 — Stop / review checklist

Align with `_goal.md` review block:

- [ ] Today's `{project-name}-{yyyy-mm-dd}.md` exists
- [ ] Issue lists present
- [ ] PRs to review section present (or explicit none)
- [ ] Proposed cleanup actions with copy-paste commands
- [ ] Retention section documents delete/keep/none
- [ ] No application code changed
- [ ] No Linear/GitHub mutations

---

## Future automation (out of scope for agent goal)

Implemented in `packages/daily-report` — see `docs/reports/README.md`.

- `npm run report:generate` — Linear GraphQL + GitHub PR fetch, retention, markdown write
- `.github/workflows/daily-report.yml` — daily schedule + commit to `docs/reports/`
- Email delivery remains a separate follow-up

---

## Example retention walkthrough

**Today:** 2026-07-06  
**Candidates:** `…-2026-06-28.md` (8 days old), `…-2026-06-29.md` (7 days old — not a candidate; use `<` not `<=`)

**2026-06-28.md** tracked: TEC-19 (Todo), TEC-21 (Todo), PR #55 (open)  
→ **KEEP** (TEC-19 still open)

**2026-06-20.md** tracked: TEC-8 (was open in report); now Done; no open PRs  
→ **DELETE**

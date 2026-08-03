/goal ready when there is a report ready with lists of issues from mcp tool, a section listing PRs to review, and a section giving proposed actions to cleanup tasks and issues in the mcp tool with copy-paste example commands for the ai agent; stale report files older than seven days are removed unless they still reference unresolved work

reach: edit/create docs/reports/{project-name}-{yyyy-mm-dd}.md; edit only if the date is today; delete docs/reports/{project-name}-{yyyy-mm-dd}.md files older than seven days when all tracked items from that report are resolved; no changes to application code; no changes to task management system (no Linear/GitHub writes)

setup:
  1. read docs/reports/_goal.md (this file) and docs/reports/_plan.md
  2. check existing mcp tools for issues management (Linear: list_issues, get_issue, list_diffs)
  3. get all issues from mcp tool for the scoped team/project (from context/foundation/roadmap.md frontmatter project:)
  4. get open PRs to review: prefer Linear list_diffs status open; fallback gh pr list --repo <owner>/<repo> --state open when gh is available
  5. list existing docs/reports/{project-name}-*.md (exclude _goal.md, _plan.md, README.md)
  6. check (if exists) skills: .cursor/skills/rites-of-cleaning/SKILL.md, .cursor/skills/rites-of-status-query/SKILL.md

network: none during report write; data fetched in setup via mcp (and optional gh read)

mcp: only configuration visible to sandbox (e.g. .mcp.json from repo), no servers from local profile

secrets: none, no production tokens or write access, no secrets needed for the task management system

retention (run after today's report is written, before stop):
  - age threshold: report file date < today minus 7 calendar days → candidate for deletion
  - keep candidate if ANY tracked item from that file is still unresolved at setup time:
      - open Linear issue id listed under Open issues, Hygiene issues, or Proposed cleanup actions (extract TEC-NN / LIN-NN patterns)
      - open PR number listed under PRs to review (still open and not draft)
  - delete candidate only when every tracked issue is Done/Canceled/Duplicate and every tracked PR is merged/closed
  - never delete today's report; never delete _goal.md, _plan.md, or README.md
  - log deletions in today's report under ## Retention

report sections (required, in order):
  1. Summary (issue counts + open PR count)
  2. PRs to review (open, non-draft; reviewer requested or linked Linear issue)
  3. Open issues (Todo / In Progress / In Review)
  4. Hygiene issues (needs-owner, needs-acceptance-criteria, stale, blocked, roadmap drift)
  5. Proposed cleanup actions (copy-paste agent prompts + mcp json examples; read-only unless user approves later)
  6. Retention (files deleted this run; files kept despite age and why)
  7. Skills reference

stop: when today's report exists with issue lists, PRs to review section, proposed cleanup actions with copy-paste commands, and retention pass completed

review:
  - list of issues present
  - PRs to review section present (or explicit "none" row)
  - proposed cleanup actions with copy-paste commands present
  - retention pass documented (deleted / kept / none eligible)
  - no changes to application code
  - no changes to task management system
  - no secrets asked

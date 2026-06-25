# Opportunity Map

## Context

- **Project / context**: ttrpg-handouts-generator — solo maintainer, daily coordination across dev tools and task trackers
- **Data constraint**: mock / local / read-only / non-sensitive
- **Date**: 2026-06-25

## Map

| Signal | Existing / default response | Thin complement | First useful version | Data risk | Direction if valuable |
|---|---|---|---|---|---|
| No uniform handler pattern → inconsistent error handling (e.g. Supabase routes) | ESLint, dependency-cruiser, domain/ACL plans in `context/domain/`; manual code review | Read-only route audit: classify error paths (Zod, PostgREST codes, generic 500/404) per handler | Script over `src/pages/api/**` producing a mismatch report (no fixes) | local / read-only | Review / CI gate |
| Daily triage across 2–3 apps (tasks, PRs, status) | GitHub/Linear notifications, email digests, mobile apps, bookmarks | Single morning digest joining task tracker + GitHub PRs/issues | Local script on exported CSV or read-only API tokens → markdown digest | mock → read-only non-sensitive | Internal tool (async / scheduled) |
| Tasks without acceptance criteria → guessing feature shape | Issue/PR templates, `/10x-shape` and plan skills, PRD in `context/foundation/` | AC-gap report on open tickets missing criteria sections | Script on Linear/Jira export listing tickets with no AC field or empty description | mock / read-only export | Wait / process first — template enforcement before automation |

## Signal Details

### Signal 1: Inconsistent handler / error handling

**Signal:** No uniform decision on how to implement handlers (e.g. Supabase-backed routes), resulting in different error handling — e.g. `PGRST116` → 500 in one route, 404 in another; Zod errors serialized as objects the UI can't render.

**Existing / default response:** Architecture docs and a planned ACL/aggregate refactor (`context/domain/03-anti-corruption-layer.md`) address this structurally, but nothing enforces consistency today. ESLint and dependency-cruiser don't cover error semantics.

**Thin complement:** A read-only audit that scans API routes and tags each error exit (status code, error shape, adapter vs inline PostgREST handling).

**First useful version:** One-off or on-demand script report — no auto-fix, no new abstraction layer yet.

**Data risk:** local / read-only (source code only).

**Direction if it proves valuable:** Review / CI gate — fail or warn when a new route deviates from an agreed error contract.

---

### Signal 2: Daily multi-app triage

**Signal:** Every day, manually checking two or three applications to see available tasks, open PRs, and what needs attention.

**Existing / default response:** Native notifications from GitHub and Linear/Jira; email digests; Slack integrations; browser tab rotation.

**Thin complement:** A morning digest that joins "my open tasks" + "PRs awaiting me" + "recent activity" into one scannable view — links back to source systems, does not replace them.

**First useful version:** Local script reading mock JSON or exported CSV from GitHub + task tracker; outputs a static markdown file or terminal summary. No auth UI, no scheduling service yet.

**Data risk:** mock first; real version uses read-only API tokens (non-sensitive internal metadata).

**Direction if it proves valuable:** Internal tool — async / scheduled (cron or Cloudflare Worker) once the digest format earns daily use.

---

### Signal 3: Missing acceptance criteria

**Signal:** Some tasks lack acceptance criteria, forcing guesswork about final feature structure during implementation.

**Existing / default response:** PRD and shape skills (`/10x-shape`, `/10x-prd`); GitHub/Linear issue templates; plan-brief pattern in `context/changes/`.

**Thin complement:** Pre-work checklist or ticket linter that flags open items with empty AC; links to a standard AC template.

**First useful version:** Script on a ticket export listing issues missing an AC section or with description under N words.

**Data risk:** mock / read-only export.

**Direction if it proves valuable:** Wait / process first — much of this friction is essential (requirements discovery). A template + team norm may solve 80% before any tool. Automation earns value only if tickets stay non-compliant after templates land.

## Recommended First Candidate

**Candidate:** Morning triage digest

**Reads:** GitHub export or read-only API (open PRs, assigned issues, review requests) + task tracker export or API (open tasks assigned to me, in-progress items)

**Returns:** One markdown digest grouped by urgency — "needs review", "assigned to me", "blocked/waiting" — with deep links to each source system

**Does not do:**
- Replace GitHub or Linear as system of record
- Create, update, or close tickets/PRs
- Send notifications or run on a schedule (v1 is manual/on-demand)
- Aggregate more than two sources

**Data risk:** mock / local / read-only / non-sensitive — start with exported JSON/CSV fixtures; graduate to read-only tokens only after digest format is useful

**Direction if it proves valuable:** Internal tool (async / scheduled) — daily cron or Worker once format stabilizes

## Why This Candidate

1. **Repeats daily** — highest coordination cost of the three signals.
2. **Joins two information sources** — task tracker + GitHub; value comes from the join, not either app alone.
3. **Clear manual pain today** — tab-hopping every morning is observable and easy to time-box.
4. **Testable read-only** — mock exports validate layout and grouping before any API wiring.
5. **Does not replace platforms** — links out; no new system of record.
6. **Low maintenance surface** — a digest script is throwaway-friendly; if native notifications improve, discard it.

**Not the others:**
- **Signal 1 (error handling):** Real pain, but the planned ACL/aggregate refactor is the structural fix. A thin audit complements that work later as a CI gate — better as a follow-on once error contract is decided, not the first build.
- **Signal 3 (missing AC):** Partially essential complexity (requirements aren't always knowable upfront). Template + `/10x-shape` discipline likely beats a linter as first move; automation only earns its keep if non-compliance persists after process change.

## Next Direction If Valuable

**Chosen path:** Validate, then shape — `/10x-mom-test` → `/10x-shape`

Pressure-test the daily triage pain in conversation: How many minutes per morning? Which apps are always checked? What gets missed when skipping a day? If the pain survives validation, feed the opportunity into `/10x-shape` → `/10x-prd` → `/10x-roadmap` before building.

If validation reveals native GitHub + Linear combined views already cover 90%, stop at "nothing for now" — the scarce resource is maintenance attention, not startup time.

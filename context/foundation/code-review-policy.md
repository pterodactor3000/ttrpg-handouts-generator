---
project: TTRPG Handouts Generator
version: 1
status: active
created: 2026-06-29
context_type: policy
applies_to:
  - human code review
  - automated code review (packages/code-reviewer, GHA)
---

# Code Review Policy

> Cross-change policy for pull request acceptance and code review quality.
> Edit-in-place; archive when superseded.
> Complements `AGENTS.md` hard rules, `context/foundation/lessons.md`, and CI gates in `.github/workflows/ci.yml`.

## Purpose

Define what makes a pull request mergeable, how reviewers (human and automated) should evaluate changes, and when a documented exception can override a failure. This policy applies to every PR against `main`.

**Governing principle:** default state is **FAIL**. A PR reaches **PASS** only when every acceptance criterion is met and every review finding is resolved — or explicitly excepted with documentation in the PR body.

## PR states

| State | Meaning | Merge |
| ----- | ------- | ----- |
| **PASS** | All acceptance criteria met; zero unresolved review findings | Allowed |
| **FAIL** | Any criterion unmet or any unresolved finding | Blocked |
| **FAIL (documented exception)** | One or more criteria intentionally not met, with written justification in the PR | Blocked until a human approves the exception; automation still reports FAIL |

Automated review **blocks merge** and **posts findings for humans**. Humans are not optional — they confirm context the bot missed and approve documented exceptions.

## Acceptance criteria (merge gate)

Missing any criterion → **FAIL**, unless covered by a **documented exception** (see below).

| ID | Criterion | Enforced by |
| -- | --------- | ----------- |
| A1 | **CI green** — lint (type-checked ESLint), unit tests, integration tests (local Supabase), production build | GHA |
| A2 | **Hard rules** — API routes export `prerender = false`; Tailwind classes merged via `cn()`; no Next.js directives in React components; new Supabase tables have timestamped migrations with RLS and per-operation policies | Lint + review |
| A3 | **Strict scope** — change matches stated intent; no unrelated drive-by refactors or cross-cutting renames | Review |
| A4 | **Traceable intent** — PR title follows `// [Roadmap ID]::[change-id] //` convention; work maps to roadmap / Linear issue | Review |
| A5 | **Documentation** — non-obvious *why* comments where a reader would need intent; JSDoc on reusable (exported or shared) functions | Review |
| A6 | **E2E** | **Not a gate yet** — Playwright is `continue-on-error` in CI; excluded until CI requires it |

See `AGENTS.md` for the full hard-rules list and CI workflow for the automated gate details.

## Five review criteria

Each criterion pairs a judgment question with a concrete practice. **All findings must be resolved** before PASS — there is no "optional nit" bucket. Severity labels (`bug`, `risk`, `nit`, `question`) communicate urgency, not mergeability.

### 1. Correctness

**Criterion:** The code does what it claims — happy path, edge cases, error paths, no silent regressions.

**Practice:** Trace one realistic user flow through the diff. Ask what breaks when input is empty, null, concurrent, or malicious.

**Stack examples:**

- Middleware redirects unauthenticated users from `PROTECTED_ROUTES`
- Supabase SSR client handles cookie session correctly
- API routes return proper status codes on zod validation failure
- UPDATE/DELETE queries assert row ownership at the application layer (see `lessons.md`)

### 2. Repo idioms

**Criterion:** Code reads like surrounding code in the same layer — not like a foreign codebase.

**Practice:** Compare the changed file to a sibling in the same directory or layer. Flag patterns that fight established conventions.

**Stack examples:**

- Astro components for static layout; React only when interactivity is needed
- Hooks extracted to `src/components/hooks/`
- API routes: uppercase `GET`/`POST` exports, zod input validation
- Migrations: `YYYYMMDDHHmmss_short_description.sql` naming
- Project imports use `@/` aliases, not deep relative paths
- UI components follow Atomic Design granularity (`lessons.md`)

### 3. Minimal scope and complexity

**Criterion:** The simplest design that fully solves the stated problem; no accidental complexity or unrelated changes.

**Practice:** **Strict.** Files outside the change's stated scope require justification in the PR or rejection. "While I was here" refactors belong in a separate PR or need a documented exception.

**Stack examples:**

- Do not refactor a service in a handout UI PR
- Do not rename files across the repo in a bugfix
- Do not add abstractions used only once

### 4. Risk-weighted test coverage

**Criterion:** Parts most likely to break are tested deliberately; tests assert behavior, not presence.

**Practice:** Map risk to test type. CI passing is necessary but not sufficient — reviewer checks that meaningful behavior in the diff is covered.

| Risk | Test type |
| ---- | --------- |
| Pure logic, formatters, parsers | Unit (`--project unit`) |
| Auth, Supabase queries, API contracts, RLS | Integration (`--project integration`) |
| Critical user journeys | E2E (not a gate yet) |

**Stack examples:**

- New API route → request/response tests with specific assertions (`toEqual`, not `toBeTruthy`)
- New RLS policy → integration test proving deny and allow paths
- Edge cases: empty, null, boundary values, error paths

### 5. Security and data safety

**Criterion:** No new attack surface — secrets, RLS gaps, unvalidated input, auth bypass, leaked internals.

**Practice:** Always review migrations for RLS; API routes for zod + auth checks; env vars for server-only exposure. Security findings block merge without a documented exception.

**Stack examples:**

- Secrets via `astro:env/server` or env vars — never in source or client bundles
- Parameterized SQL only; validate user input at system boundaries
- API responses do not leak stack traces or internal paths
- New tables: RLS enabled with granular per-operation policies

## Review process (human reviewers)

| Practice | Rule |
| -------- | ---- |
| Actionable feedback | Location, problem, fix — no hedging ("I noticed that…", "you might want to…") |
| Severity labels | `bug` (broken behavior) · `risk` (fragile) · `nit` (style/naming) · `question` (genuine ask) — **all blocking until resolved or excepted** |
| Diff-focused | Review what changed; do not re-litigate unrelated architecture unless the change forces it |
| Explain the why | Required when the fix is not obvious (security, races, RLS, auth implications) |
| Verdict | PASS · FAIL · FAIL (documented exception) |

Compressed review style (one line per finding: `L42: user can be null. Add guard.`) is encouraged for human comments when signal density matters; expand for security findings and architectural disagreements.

## Documented exceptions

When a criterion cannot be met in this PR, the PR description must include an **Acceptance exceptions** section. Without it, state remains **FAIL**.

Each exception entry must state:

1. **Criterion** — acceptance ID (A1–A5) or review criterion (1–5) plus finding ID if applicable
2. **Why** — constraint, dependency, or accepted debt that prevents meeting the criterion now
3. **Risk mitigation** — what limits exposure (narrowed scope, manual verification, compensating control)
4. **Follow-up** — Linear/GitHub issue link, or explicit "accepted permanent debt" with rationale

### Exception template

```markdown
## Acceptance exceptions

### A3 — Strict scope
- **Criterion:** A3
- **Why:** Shared `formatDate` helper needed by handout preview and dashboard; single PR avoids broken intermediate state.
- **Risk mitigation:** Both call sites updated in same commit; unit tests for helper.
- **Follow-up:** None — intentional shared utility.
```

Human approval is required before merge when exceptions are present. Automation reports FAIL regardless; humans decide whether the exception is acceptable.

## Automated review alignment

The `packages/code-reviewer` agent and future GHA workflow should mirror this policy:

| Policy | Automation behavior |
| ------ | ------------------- |
| Default FAIL | `state: pass` only when findings is empty and no `not_met` acceptance criteria |
| All findings blocking | Any finding or `not_met` acceptance criterion → `fail` or `fail_documented_exception`; no severity-based auto-pass |
| Review order | security → correctness → repo_idioms → minimal_scope → test_coverage |
| Block + inform | Failed review applies `ai-cr:failed` label and posts PR comment; `mergeBlocked: true` on output |
| Exceptions | Parse `## Acceptance exceptions` from PR body → `fail_documented_exception`; human approval still required |
| Inputs | PR title, git diff; PR description when exception detection or A4 assessment needed |
| Output schema | `packages/code-reviewer/src/schemas/code-review-output.ts` |

Labels (planned GHA side-effects):

- `ai-cr:failed` — review FAIL; merge blocked
- `ai-cr:passed` — review PASS
- `ai-cr:review` — on-demand retry trigger

## Relationship to other foundation docs

| Doc | Relationship |
| --- | ------------ |
| `AGENTS.md` | Hard rules referenced by A2; day-to-day agent conventions |
| `lessons.md` | Recurring patterns reviewers enforce (ownership asserts, `@/` imports, Atomic Design, etc.) |
| `roadmap.md` | Source for Roadmap ID and change-id in PR titles (A4) |
| `test-plan.md` | Phased test rollout; E2E gate timing when Playwright becomes required |
| `m5l4-shared-conventions` (prompt handout) | Starter naming, error handling, TypeScript, security, and testing conventions — adapt into review findings |

## Revision history

| Date | Change |
| ---- | ------ |
| 2026-06-29 | Initial policy — five review criteria, six acceptance criteria (A6 parked), strict scope, all findings blocking, documented exception process |

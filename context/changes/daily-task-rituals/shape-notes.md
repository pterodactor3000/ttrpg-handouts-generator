---
project: Daily Task Rituals
context_type: greenfield
parent_repo: ttrpg-handouts-generator
artifact_path: context/changes/daily-task-rituals/shape-notes.md
created: 2026-06-25
updated: 2026-06-25
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: prior session handling
      decision: separate shape-notes as subsystem under context/changes/daily-task-rituals/; TTRPG foundation shape-notes preserved
    - topic: context type
      decision: greenfield — new standalone helper tool, not a change to the Astro app
    - topic: pain category
      decision: workflow friction
    - topic: primary persona scope
      decision: developers on a team with field filter (frontend/backend/etc.)
    - topic: access model
      decision: CLI with personal API tokens or exports; no login UI
    - topic: role separation
      decision: flat — each developer runs own instance with own tokens and field filter
    - topic: mvp flow
      decision: delta since last run — not full snapshot
    - topic: scope cost
      decision: scope down — v1 includes markdown output; defer duplicate-fix detection and Linear↔GitHub cross-link to v2
  frs_drafted: 6
  quality_check_status: accepted
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: null
product_type: cli
target_scale:
  users: small
---

## Vision & Problem Statement

Developers on a team start each work day with a ritual of checking GitHub and Linear separately — roughly 10 minutes per app, then another ~10 minutes mentally triaging what actually matters. That is ~30 minutes daily before focused work begins. Native views in GitHub and Linear cover most raw data; the cost is workflow friction — repeating the same cross-app synthesis every morning.

When the ritual is skipped, developers miss team updates, don't know if in-flight tasks were reviewed, and may redo work already fixed elsewhere. The insight from validation: a helper should not duplicate open-item lists; it should surface **what changed** in the developer's field (frontend/backend/etc.), recommend what to pick next when nothing is in flight, and list PRs awaiting attention — read-only, non-sensitive data only.

## User & Persona

**Primary persona:** Developer on a team (IC engineer)

They work in a defined engineering field (e.g. frontend, backend). Each morning they need a short, scannable answer to: "What updated in my field since I last checked, what should I take next if I have nothing in flight, and are there PRs I should look at?" They currently solve this by opening GitHub, then Linear, then mentally joining the two. They do not want the helper to mutate tasks, add comments or tags, or cross into management-only views.

## Access Control

**Auth model:** CLI tool run locally. Each developer supplies personal read-only API tokens (or local export files) for GitHub and Linear. No login UI, no shared server session.

**Role separation:** Flat. No admin or team-lead role in v1. Each developer configures their own field filter (frontend/backend/etc.) and runs the helper on their machine. No cross-user visibility enforced by the tool.

## Success Criteria

### Primary

Developer runs the CLI on demand with local read-only tokens (or export files) for GitHub and Linear. The helper returns a **delta report** — tasks in their configured field (frontend/backend/etc.) that changed since the last run — plus a PR list if any await attention, and a recommendation for what to take next when nothing is in flight. Output is read-only; no task state mutations.

### Secondary

Digest is saved as a markdown file for offline skimming.

Deferred to v2: duplicate-fix detection (flag when a bug was closed by another PR) and Linear issue ↔ GitHub PR cross-linking.

### Guardrails

- **Read-only:** The helper never writes to GitHub or Linear — no state updates, comments, or tags in v1.

## Functional Requirements

### Configuration & connection

- FR-001: Developer can configure their engineering field filter (e.g. frontend, backend). Priority: must-have
  > Socrates: Counter-argument considered: "defer field filter; show all assigned items." Resolution: kept; without field filter the digest is noise for team developers.

- FR-002: Developer can connect the helper to GitHub and Linear using local read-only API tokens or export files. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

- FR-003: Developer can run the helper on demand and see tasks in their field that changed since the last run. Priority: must-have
  > Socrates: Counter-argument considered: "full open lists duplicate native views." Resolution: kept; delta since last run is the differentiator, not another dashboard.

- FR-004: Developer can see a list of PRs awaiting their attention. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

- FR-005: Developer can receive a recommendation for the next task to take when nothing is in flight. Priority: must-have
  > Socrates: No counter-argument; it stands as written.

### Output

- FR-006: Developer can save the digest output as a markdown file. Priority: must-have
  > Socrates: Counter-argument considered: "terminal output alone is enough." Resolution: kept; markdown file enables offline skimming without re-running.

## User Stories

### US-01: Morning delta digest

- **Given** a developer with configured field filter and valid read-only tokens for GitHub and Linear
- **When** they run the helper on a new work day
- **Then** they see a delta report of field-scoped task changes since the last run, a PR list if any await attention, a next-task recommendation when nothing is in flight, and a saved markdown file

#### Acceptance Criteria

- Report includes only items in the developer's configured field (frontend/backend/etc.)
- Report excludes management-only or other-field items
- Helper performs no writes to GitHub or Linear
- Output includes enough identifiers for the developer to open the source item in GitHub or Linear manually

## Business Logic

**Core rule:** The helper identifies which tasks in the developer's configured field changed since the last run and surfaces only that delta — replacing manual cross-app re-triage with a single read-only pass.

**How the user encounters it:**

The developer configures their field filter and connects read-only GitHub and Linear sources. On each run, the helper compares the current state against a locally stored snapshot from the previous run. Items that changed status, assignment, or review state within the developer's field appear in the delta report. If no items are in flight, the helper applies a recommendation rule to suggest what to take next. PRs awaiting the developer's attention are listed separately. The full digest is written to a markdown file.

## Non-Functional Requirements

- **Run duration:** A full digest run completes in under 30 seconds as perceived by the developer (from command invocation to markdown file written).

## Non-Goals

- **No writes:** The helper does not update task states, add comments, or apply tags in GitHub or Linear.
- **No cross-linking in v1:** Linear issue ↔ GitHub PR linking is deferred to v2.
- **No scheduled delivery:** No cron, Worker, or email push in v1 — on-demand CLI only.
- **No third data sources:** No Slack, Jira, or other integrations beyond GitHub and Linear in v1.

## Quality cross-check

All elements present. No gaps flagged.

## Forward: handoff notes

- TTRPG Handouts Generator shape-notes preserved at `context/foundation/shape-notes.md` (complete, phase 8).
- This subsystem PRD should be generated from this file, not the foundation shape-notes.
- Run `/10x-prd @context/changes/daily-task-rituals/shape-notes.md` (or equivalent path argument).


# Mom Test Validation Plan

## Input Idea

**Morning triage digest** — a read-only join of GitHub + Linear that reduces daily tab-hopping before work begins. Source: `context/team/opportunity-map.md` (Signal 2, recommended first candidate).

## Hypotheses

- **User/role:** Developer on a team (day job) who also maintains ttrpg-handouts-generator solo; daily coordination across GitHub and Linear.
- **Friction:** ~20 minutes browsing two apps, then ~10 minutes mentally triaging what actually matters — ~30 minutes total every working day.
- **Current workaround:** Open GitHub (~10 min), open Linear (~10 min), then manually synthesize: team updates, review status on in-flight work, whether bugs already got fixed elsewhere.
- **Proposed solution:** Local/on-demand digest joining assigned tasks, open PRs, review requests, and recent activity into one scannable markdown view with deep links.
- **Risky assumptions:**
  - A third view adds value over native GitHub + Linear (user says native views already cover most raw data).
  - The pain is *access* to information rather than *synthesis* across systems.
  - A solo script is maintainable long-term vs. tuning native notification filters once.
  - "Team update" gaps are a tooling problem, not a ritual/process problem (standup, Slack, etc.).
- **Evidence already present (behavior, not opinion):**
  - **Frequency:** Daily, every working day.
  - **Time cost:** ~10 min GitHub + ~10 min Linear + ~10 min triage = **~30 min/day** (~2.5 hr/week).
  - **Cost of skipping:** Miss team updates; don't know if in-flight tasks were reviewed; don't know if bugs being fixed were already resolved by another PR/feature.
  - **Existing tools adequacy:** User confirms GitHub + Linear native views **do cover most of the raw information** — the remaining cost is cross-app synthesis, not missing dashboards.

## Critique

### What holds up

The problem is **real and behavioral**, not aspirational:

- Specific time budget (30 min/day).
- Specific failure modes when skipping (review status, duplicate fix work, team drift).
- Repeated daily ritual, not a one-off annoyance.

This passes the Mom Test for *problem existence*.

### Where the original idea was too broad

The opportunity map framed a **"morning digest"** — that risks duplicating what GitHub and Linear already show. The user explicitly said native views cover most of it. Building another list of PRs and tasks would save little; the user would still mentally triage.

The actual pain is the **second pass**:

1. **Cross-system join** — "Is this Linear task the same work as that GitHub PR?"
2. **In-flight delta** — "What changed on *my* items since yesterday?" (reviewed? merged? closed by someone else?)
3. **Duplicate-work detection** — "Did someone else already fix the bug I'm on?"

A solution that only aggregates open items **without delta and join logic** would likely shave minutes off browsing but **not eliminate the 10-minute triage block**.

### Solution vs. problem check

| Proposed element | Problem or solution? | Verdict |
|---|---|---|
| Single markdown file | Solution | Keep only if it answers delta/join questions |
| List of open PRs + tasks | Duplicates native views | Drop as primary value |
| "Needs review / assigned / blocked" buckets | Partial solution | Keep if derived from cross-source rules |
| Scheduled cron delivery | Solution (premature) | Defer — on-demand first |

### What would prove "not worth building"

- After one week of a prototype, total morning time stays above 25 min (browsing saved but triage unchanged).
- Native GitHub + Linear notification tuning (review requests, assigned issues, Linear My Issues filter) reduces triage to under 5 min without custom tooling.
- The "missed when skipping" scenarios are rare (< once/month) in practice.

### What would prove "worth building"

- Prototype reduces **triage time** (the second 10 min), not just **browse time** (the first 20 min).
- User can answer in under 60 seconds: "What changed on my in-flight work since yesterday?" and "Was bug X already fixed?"
- Digest is opened daily for 2+ weeks without feeling stale or redundant with native tabs.

## Interview Guide

*Use with 1–3 teammates who share the GitHub + Linear workflow. 20–30 minutes.*

### Context warm-up

1. Walk me through how you start a typical work day — what do you open first, and in what order?
2. How often do you check GitHub and your task tracker on the same day?

### Recent story

3. Think about **yesterday morning** — what did you look for in GitHub and Linear before you started real work?
4. Tell me about the **last time** you discovered someone else had already fixed a bug you were working on. How did you find out?
5. When did you last learn a PR or task you cared about had been reviewed or merged **without you noticing earlier**? What happened?

### Current workaround

6. What filters, saved views, or notification settings do you use in GitHub and Linear today?
7. After you finish browsing both apps, what do you still hold in your head or write down before you pick what to work on?

### Cost of pain

8. Roughly how many minutes does that whole routine take on a normal day?
9. What goes wrong when you skip it — missed reviews, duplicate work, wrong priority, something else?

### Existing alternatives

10. Have you tried Slack/email digests, mobile notifications, or a personal checklist? What stuck and what didn't?

### Decision signal

11. If you had a single page that only showed **what changed since yesterday on items you're involved in**, would that change which step you skip — browsing or triaging?
12. What would make you stop opening GitHub and Linear separately in the morning?

### Closing

13. Can I see (anonymized) how your Linear "My issues" and GitHub notifications are set up today?

**Follow-ups:**

- "Can you show me that in the app?"
- "How often does that actually happen vs. you worrying it might?"
- "What did you do instead?"

## Survey

*For broader team signal. 6–10 questions.*

**Screener:** Do you use both GitHub and a task tracker (Linear, Jira, etc.) on most working days?
- No → end survey
- Yes → continue

1. On a typical work day, how many minutes do you spend checking GitHub before starting focused work?
   - 0–5 / 6–10 / 11–20 / 21–30 / 30+

2. Same question for your task tracker (Linear/Jira/etc.).

3. After checking both, how many minutes do you spend deciding what to work on?
   - 0 / 1–5 / 6–10 / 11–20 / 20+

4. In the last two weeks, how often did you learn **after the fact** that a bug or task you were on was already handled by someone else?
   - Never / Once / 2–3 times / Weekly or more

5. Same period — how often did you miss that something **you submitted** (PR, task, review request) had been completed or reviewed?
   - Never / Once / 2–3 times / Weekly or more

6. Which native views or notifications do you rely on most? (select all)
   - GitHub PR inbox / review requests / email notifications
   - Linear My Issues / assigned / cycle view / Slack integration
   - Other: ___

7. Open: Describe the **last time** skipping your morning check caused a problem. What did you miss?

8. Open: If one report could answer **one question** every morning, what would that question be?

## Decision Criteria

Based on self-reported evidence from the idea owner:

### Proceed → `/10x-shape` (narrow scope)

**Threshold met:**

- Daily frequency with **measurable time cost** (~30 min/day).
- Concrete skip cost (team drift, review blindness, duplicate fix risk).
- Problem is synthesis/join, not missing native views.

**Scoped shape:**

- **Not:** generic open-items digest.
- **Yes:** "in-flight delta" report — changes since last run on items the user owns, touches, or watches across GitHub + Linear.
- **v1:** on-demand local script, mock data first, no scheduler, no third data source.

### Narrow scope if

- Prototype saves browse time but triage stays ~10 min → add cross-link rules (Linear issue ↔ GitHub PR) and "already fixed?" heuristics before scheduling.
- Only one of the two miss scenarios (duplicate fix vs. review status) shows up in interviews → build for the frequent one only.

### Do not build yet if

- Two weeks of tuned GitHub + Linear notifications drop total routine under 10 min without custom tooling.
- User stops opening the digest after week one (redundant with tabs).

### Try existing tool/process first if

- "Team update" gaps are solved by standup/Slack and the real pain is personal prioritization → process before code.
- GitHub "For you" + Linear "My issues" + review-request notifications cover delta needs once configured — **run a 1-week experiment tuning notifications before writing code.**

## Verdict

**Narrow scope → proceed to `/10x-shape`.**

The problem is validated. The original "morning digest" framing is **too broad** given that native views already cover most raw data. Shape a **cross-app in-flight delta** tool, not another task list.

Recommended shape constraint for `/10x-shape`:

> "What changed since yesterday on work I'm involved in, across GitHub and Linear, so I don't re-triage from scratch or redo fixed bugs."

Optional 1-week experiment before build: maximize GitHub review-request + Linear assigned-issue notifications; log whether triage time drops below 5 min. If not, shape and build the delta report.

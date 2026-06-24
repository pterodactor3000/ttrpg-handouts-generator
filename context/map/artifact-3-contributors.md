# Artifact 3 — Contributors (who to ask)

**Status:** complete  
**Method:** git authorship on high-touch / high-risk areas (last 12 months)  
**Depends on:** `artifact-1-territory.md`, `artifact-2-structure.md`  
**Prompt:** `.cursor/prompts/m4l2-3-contributors-git.md`  
**Generated:** 2026-06-21

Who likely knows which parts of the codebase — for onboarding and change planning.

---

## Filters

- **Window:** last 12 months (`--since=2025-06-21`; equals full repo history — project started 2026-05-22)
- **Scope:** `git log --all` — **198 commits** after merge commits included
- **Excluded:** bots and automation (`dependabot`, `github-actions[bot]`, `renovate[bot]`, `[bot]` authors) — **none found**
- **Agent commits:** no `Co-authored-by` lines for Claude/Copilot/Codex in commit bodies; all commits attributed to the human maintainer (AI-assisted work may still be present but not separately attributed in git)
- **Author normalization:** `pterodactor3000` and `Mikołaj Grygorcewicz` merged — same email `m.grygorcewicz@eldritchcode.it`

---

## Top 5 areas needing contributor contact

Derived from territory activity + structural risk (artifact 1 + 2).

| Rank | Area / module | Why contact may help | Territory signal | Structure signal |
| ---- | ------------- | -------------------- | ---------------- | ---------------- |
| 1 | **Handout UI vertical slice** — `HandoutEditor`, molecules/atoms, `global.css`, dashboard/share pages | Highest git churn + highest fan-out (`HandoutEditor` → 10 deps); visual/editor changes span many files | #2 hot folder (`organisms`), #3 file (`global.css`); atoms/molecules co-change #1 | Structural hub; organism→organism import (`ShareDialog`) |
| 2 | **Handout API + auth middleware** — `src/pages/api/handouts/*`, `src/pages/api/auth/*`, `middleware.ts` | Auth gates and CRUD endpoints co-evolve; mistakes affect all protected routes | 27 commits on `src/pages/api`; middleware 7 commits | `supabase.ts` fan-in 9; API routes import only lib (clean) |
| 3 | **Lib / markdown pipeline + theming** — `handout-renderer`, `backgrounds`, `fonts` | XSS/sanitize boundary and themed rendering; isolated in graph but security-sensitive | 22 commits on `src/lib` | `handout-renderer` leaf with 7 npm deps; unit-tested |
| 4 | **Integration tests + DB/RLS** — `__tests__/integration/*`, `supabase/migrations/` | Policy matrix and handout ownership tests encode access rules | 11+ commits on integration tests | Not visible in dependency-cruiser graph — manual/DB knowledge |
| 5 | **Infra / observability** — Sentry, Cloudflare/Wrangler, CI, Supabase config | Deploy/runtime env and error capture span API + middleware + pages | Sentry/CI changes in foundation roadmap arcs | `astro:env/server` virtual imports; middleware + Sentry coupling |

---

## Contributors by area

### Area 1: Handout UI vertical slice

| Contributor | Commits touching area (12 mo) | Thematic focus | Support fit |
| ----------- | ----------------------------- | -------------- | ----------- |
| Mikołaj Grygorcewicz (pterodactor3000) | **110** | HandoutEditor (17 file touches), `global.css` (11), HandoutCard (9), dashboard/share pages; subjects: `s-03`, `ui-restyle`, `retheme-backgrounds`, `per-style-fonts`, `handout-dashboard` | **Primary** — built the editor, themed cards, and page flows end-to-end |

_No other human contributors in window._

### Area 2: Handout API + auth middleware

| Contributor | Commits touching area (12 mo) | Thematic focus | Support fit |
| ----------- | ----------------------------- | -------------- | ----------- |
| Mikołaj Grygorcewicz (pterodactor3000) | **34** | `[id].ts`, publish/archive routes, `middleware.ts`; subjects: `first-handout-creation-and-sharing`, `delete-handout`, `s-03`, `testing-access-control-critical-path`, `sentry-introduction` | **Primary** — owns API shape, auth gate, and error capture wiring |

### Area 3: Lib / markdown + theming

| Contributor | Commits touching area (12 mo) | Thematic focus | Support fit |
| ----------- | ----------------------------- | -------------- | ----------- |
| Mikołaj Grygorcewicz (pterodactor3000) | **20** | `handout-renderer.ts`, `backgrounds.ts`, `fonts.ts`; subjects: `markdown-preview-and-parsing`, `testing-markdown-rendering-safety`, `retheme-backgrounds`, `per-style-fonts` | **Primary** — owns sanitize/render pipeline and category theme config |

### Area 4: Integration tests + DB/RLS

| Contributor | Commits touching area (12 mo) | Thematic focus | Support fit |
| ----------- | ----------------------------- | -------------- | ----------- |
| Mikołaj Grygorcewicz (pterodactor3000) | **25** | RLS policy matrix, handout validation/ownership/edit integration tests, test helpers; subjects: `testing-access-control-critical-path`, `testing-api-db-handout-coverage`, `test-plan-refresh-*`, `s-03` tests | **Primary** — wrote integration harness and RLS test matrix |

### Area 5: Infra / CI / observability

| Contributor | Commits touching area (12 mo) | Thematic focus | Support fit |
| ----------- | ----------------------------- | -------------- | ----------- |
| Mikołaj Grygorcewicz (pterodactor3000) | **34** | Supabase client/config, Sentry (Astro + Cloudflare), CI workflows, Wrangler/Cloudflare adapter; subjects: `sentry-introduction`, `testing-quality-gate-wiring`, bootstrap/setup commits | **Primary** — solo infra owner for deploy and observability |

---

## Cross-area experts

People with broad touch across multiple hot zones.

| Contributor | Areas touched | Notes |
| ----------- | ------------- | ----- |
| Mikołaj Grygorcewicz (pterodactor3000) | **All 5** | Only human author in repo history; 198/198 commits. Subject themes (non-exclusive): planning/context (~88), handout product (~82), testing (~56), UI theming (~34), infra (~14), markdown safety (~9), schema (~9), auth (~7) |

---

## Gaps

Areas with no clear human owner in the window (solo maintainer, stale ownership, or bot-heavy history).

| Area | Gap type | Mitigation |
| ---- | -------- | ---------- |
| **All runtime areas** | Solo maintainer — no backup contact in git | Document decisions in `context/foundation/lessons.md`; use archived change plans under `context/archive/` for historical “why” |
| **Astro SSR pages (`.astro`)** | Same owner, but graph tooling doesn’t attribute `.astro`-only wiring | Read page frontmatter imports alongside `artifact-2-structure.md` |
| **Agent-assisted commits** | No separate attribution in git | Treat `context/` plans + impl reviews as provenance when commit message is vague |
| **External reviewers** | Merge PRs exist (#23–#41) but all merged by maintainer — no distinct co-author emails | Check GitHub PR discussions for one-off reviewers if needed |

---

## Key observations

1. **Single owner** — entire codebase history belongs to one person; “who to ask” collapses to one contact for every zone.
2. **Breadth over depth in git metadata** — same author touched UI, API, tests, and infra; thematic subjects show intentional vertical slices (`s-03`, `delete-handout`, `retheme-backgrounds`) rather than siloed teams.
3. **No bot noise** — dependency and CI commits are still authored by the maintainer; contributor map is clean but not diverse.
4. **Testing ownership is real** — ~56 subject-matched test commits; integration/RLS knowledge lives with the same person who wrote the API.
5. **Planning docs are co-maintained** — high `context/foundation` churn (artifact 1) is the same author; roadmap/lessons are the best secondary source when the maintainer is unavailable.

---

## Handoff to repo map

Per risk zone → 1–2 recommended contacts (for `repo-map.md` § “Who to ask”):

| Zone | Contact(s) | Reason |
| ---- | ---------- | ------ |
| Handout UI / editor / theming | **Mikołaj Grygorcewicz** (`pterodactor3000`) | 110 commits in UI slice; HandoutEditor + CSS owner |
| API + auth + middleware | **Mikołaj Grygorcewicz** | 34 commits; access-control and handout route author |
| Markdown / XSS boundary | **Mikołaj Grygorcewicz** | Renderer + markdown safety test owner |
| RLS / integration tests | **Mikołaj Grygorcewicz** | RLS policy matrix and handout integration tests |
| Deploy / Sentry / Supabase | **Mikołaj Grygorcewicz** | Infra bootstrap and sentry-introduction changes |
| Fallback (docs) | `context/foundation/lessons.md`, archived `context/archive/*/plan.md` | Written provenance when live contact unavailable |

---
change_id: test-plan-refresh-2026-06-19
title: Refresh test-plan.md for 2026-06-19: e2e, Sentry, Risk #8 (RLS/migration prod parity), and guide reconciliation
status: archived
created: 2026-06-19
updated: 2026-06-19
archived_at: 2026-06-19T11:27:30Z
---

## Notes

Refresh context/foundation/test-plan.md without editing it in place until the implement chain's final sub-phase.

Staleness targets:
- §4 e2e: currently "none yet" → Playwright 1.60, `npm run test:e2e`, `e2e/player-share-link.spec.ts` (Risk #2 SSR layer)
- §4 Sentry: absent → @sentry/astro + @sentry/cloudflare 10.57 (shipped sentry-introduction)
- §5 gates: no e2e gate → add optional/required e2e gate once Phase 3 of this refresh lands
- §6.1 paths: `src/lib/__tests__/` → `__tests__/lib/` (tests moved to repo-root __tests__/)
- §6 missing patterns: archive/delete integration suites; e2e share-link pattern
- §2 Risk #5 response: archive via admin fixture → real archive endpoint exists; link-permanence testable at app layer
- §8 ledger: bump strategy, stack, MCP checked dates to 2026-06-19

New Risk #8 (from interview Q2+Q3 + hot-spot supabase/migrations): Migration or RLS policy change applies cleanly locally but breaks prod access patterns (GM CRUD fails, anon share read denied, or cross-owner access widened). Impact High, Likelihood Medium.

Proposed rollout phases (append after existing complete rows):
1. Guide reconciliation — fix §4/§5/§6/§8 drift; no new tests unless cookbook references need a smoke assertion.
2. RLS + migration safety — Risk #8; integration tests for policy/migration regressions on fresh Supabase.
3. E2E CI wiring — Risk #2 SSR gap + interview Q4; wire Playwright share-path in `.github/workflows/ci.yml`.

## Epilogue

Commit `c1664ed` (`docs(cavecrew): ...`) bundled Phase 3 implementation files (`playwright.config.ts`, `.github/workflows/ci.yml`, `e2e/auth.setup.ts`) with unrelated tooling churn (~80 files: `.agents/skills/cave*/**`, `.cursor/**`, `context/archive/**`, etc.). Impl review F7 accepted this as historical fact — future change commits should isolate change-scoped files.

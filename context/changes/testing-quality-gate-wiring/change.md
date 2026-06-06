---
change_id: testing-quality-gate-wiring
title: Wire unit and integration test suite into CI quality gate
status: implementing
created: 2026-06-06
updated: 2026-06-06
archived_at: null
---

## Notes

Open a change folder for rollout Phase 4 of context/foundation/test-plan.md: "Quality-gate wiring".
Risks covered: cross-cutting (dev/prod parity — interview Q2; §2 cross-cutting note).
Test types planned: gates (CI workflow wiring for unit + integration suites).
Risk response intent:
- Cross-cutting dev/prod parity: prove the full Vitest suite (unit + integration projects) runs in CI against a realistic Supabase-backed environment before merge, so "works locally, breaks in prod" regressions are caught at the gate — not by a single risk-specific test.

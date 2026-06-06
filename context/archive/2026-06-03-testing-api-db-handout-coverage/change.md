---
change_id: testing-api-db-handout-coverage
title: API and DB integration harness with handout-route coverage
status: archived
created: 2026-06-03
updated: 2026-06-04
archived_at: 2026-06-04T11:19:27Z
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "API + DB integration harness & handout-route coverage".
Risks covered: #4 (IDOR — a GM mutates/reads another GM's handout by id), #5 (handout state-machine transition breaks publish token / archive link-permanence), #6 (API route trusts client input, missing server-side validation), #7 (raw DB error leaked to the client).
Test types planned: integration (Astro API routes against Supabase).
Risk response intent:

- #4: prove a GM cannot read/update/delete a handout owned by another gm_id (no mutation); PUT cross-owner returns 500 today (404 on publish); ownership must be asserted at the app layer, not just RLS.
- #5: prove publish mints a usable share token + sets published, and archive hides from the GM list but keeps the shared link live.
- #6: prove malformed/oversized/missing-field payloads are rejected with a clean error and nothing is persisted.
- #7: prove a forced DB failure returns a generic message with no table/column/constraint names in the response body.
  This phase must also establish the reusable Supabase API + DB integration test harness (the interview Q4 capability gap) that Phase 2 will reuse.

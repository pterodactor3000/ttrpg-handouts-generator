## // [SUMMARY] //

<!-- What changed and why (1–3 sentences). -->

## // [TEST PLAN] //

- [ ] `npm run lint`
- [ ] `npm test -- --project unit`
- [ ] `npm test -- --project integration` (local Supabase running)
- [ ] Manual verification (if applicable):

## // [ACCEPTANCE EXCEPTIONS] //

<!-- Delete this entire section if every acceptance criterion is met and all review findings are resolved.
     Required when any criterion (A1–A5) or review finding cannot be met in this PR.
     Human approval required before merge. See context/foundation/code-review-policy.md -->

### // [CRITERION LABEL] :: [SHORT TITLE] //

- **Criterion:** A3
- **Why:** Shared `formatDate` helper needed by handout preview and dashboard; single PR avoids broken intermediate state.
- **Risk mitigation:** Both call sites updated in same commit; unit tests for helper.
- **Follow-up:** None — intentional shared utility.

---

// COMPUTED BY:: // [model-name] COGITATOR //

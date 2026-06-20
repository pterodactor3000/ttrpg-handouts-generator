---
change_id: testing-markdown-rendering-safety
title: Markdown rendering safety tests (test-plan Phase 3)
status: archived
created: 2026-06-06
updated: 2026-06-19
archived_at: 2026-06-19T00:00:00Z
---

## Notes

Open a change folder for rollout Phase 3 of `context/foundation/test-plan.md`: "Markdown rendering safety".

Risks covered: #3 (malicious markdown renders executable script / XSS in preview or shared read-only page).

Test types planned: unit (pure renderer, adversarial inputs).

Risk response intent:

- Prove `<script>`, `onerror`, or `javascript:` payloads are neutralized in rendered output in both preview and shared view.
- Challenge: "rehype-sanitize is installed" does not mean it is wired and cannot be bypassed via raw HTML or link protocols.
- Avoid: asserting benign markdown only; snapshotting rendered HTML (brittle, breaks on trivial change).

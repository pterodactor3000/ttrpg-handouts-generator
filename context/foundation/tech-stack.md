---
starter_id: 10x-astro-starter
package_manager: npm
project_name: ttrpg-handouts-generator
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

A solo learner shipping a TTRPG handouts generator MVP in 3 weeks (after-hours only) with auth needs a battle-tested, agent-friendly starter that handles auth + database + edge deploy out of the box. Astro+Supabase+Cloudflare is the recommended default for `(web-app, js)` and clears all four agent-friendly gates; its bootstrapper confidence is first-class, so scaffolding should be mostly smooth with occasional manual steps. Auth is in scope per PRD FRs (email/password or OAuth); payments, realtime, AI, and background jobs are out of scope. CI runs on GitHub Actions with auto-deploy-on-merge — what the starter ships with.

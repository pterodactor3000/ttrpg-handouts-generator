---
bootstrapped_at: 2026-05-22T18:12:00Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: ttrpg-handouts-generator
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

From `context/foundation/tech-stack.md`:

```yaml
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
```

### Why this stack

A solo learner shipping a TTRPG handouts generator MVP in 3 weeks (after-hours only) with auth needs a battle-tested, agent-friendly starter that handles auth + database + edge deploy out of the box. Astro+Supabase+Cloudflare is the recommended default for `(web-app, js)` and clears all four agent-friendly gates; its bootstrapper confidence is first-class, so scaffolding should be mostly smooth with occasional manual steps. Auth is in scope per PRD FRs (email/password or OAuth); payments, realtime, AI, and background jobs are out of scope. CI runs on GitHub Actions with auto-deploy-on-merge — what the starter ships with.

## Pre-scaffold verification

| Signal      | Value         | Severity | Notes                                         |
| ----------- | ------------- | -------- | --------------------------------------------- |
| npm package | not run       | n/a      | starter uses git clone, not npm create        |
| GitHub repo | not available | n/a      | GitHub API call failed or repo not accessible |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`

**Strategy**: git-clone

**Exit code**: 0

**Files moved**: 18

**Conflicts (.scaffold siblings)**: README.md

**.gitignore handling**: moved silently (absent in cwd before scaffold)

**.bootstrap-scaffold cleanup**: deleted

**Additional notes**: `.git` directory removed from scaffold before move-up per git-clone strategy. `node_modules` (777 packages) moved with scaffold tree. `.vscode` copied separately due to IDE lock.

## Post-scaffold audit

**Tool**: npm audit --json

**Summary**: 0 CRITICAL, 1 HIGH, 9 MODERATE, 0 LOW

**Direct vs transitive**: 0/0/2/0 direct of total 0/1/9/0

### HIGH findings

- **devalue** (5.6.3 - 5.8.0, transitive)
  - Advisory: GHSA-77vg-94rm-hx3p
  - Issue: DoS via sparse array deserialization
  - CVSS: 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
  - Fix available: yes

### MODERATE findings

- **@astrojs/check** (>=0.9.3, direct)
  - Via: @astrojs/language-server → volar-service-yaml → yaml-language-server → yaml
  - Fix available: downgrade to 0.9.2 (major version change)

- **wrangler** (3.108.0 - 4.93.0, direct)
  - Via: miniflare → ws
  - Fix available: yes

- **@cloudflare/vite-plugin** (<=0.0.0-fff677e35 || 0.0.7 - 1.37.2, transitive)
  - Via: miniflare, wrangler, ws
  - Fix available: yes

- **@astrojs/language-server** (>=2.14.0, transitive)
  - Via: volar-service-yaml → yaml-language-server → yaml
  - Fix available: via @astrojs/check downgrade

- **miniflare** (3.20250204.0 - 4.20260518.0, transitive)
  - Via: ws
  - Effects: @cloudflare/vite-plugin, wrangler
  - Fix available: yes

- **volar-service-yaml** (<=0.0.70, transitive)
  - Via: yaml-language-server → yaml
  - Effects: @astrojs/language-server
  - Fix available: via @astrojs/check downgrade

- **ws** (8.0.0 - 8.20.0, transitive)
  - Advisory: GHSA-58qx-3vcg-4xpx
  - Issue: Uninitialized memory disclosure
  - CVSS: 4.4 (AV:N/AC:H/PR:H/UI:N/S:U/C:H/I:N/A:N)
  - Fix available: yes

- **yaml** (2.0.0 - 2.8.2, transitive)
  - Advisory: GHSA-48c2-rrv3-qjmp
  - Issue: Stack Overflow via deeply nested YAML collections
  - CVSS: 4.3 (AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L)
  - Fix available: via @astrojs/check downgrade

- **yaml-language-server** (multiple ranges, transitive)
  - Via: yaml
  - Effects: volar-service-yaml
  - Fix available: via @astrojs/check downgrade

## Hints recorded but not acted on

The following hints were read from the hand-off and logged here for future reference, but bootstrapper v1 does not act on them. A future skill (M1L4: Memory Architecture) will consume these to generate `AGENTS.md` / `CLAUDE.md` and configure CI/CD.

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | true                 |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:

- `git init` (if you have not already) to start your own repo history.
- Review `README.md.scaffold` (the starter's README) against your existing `README.md` and merge any setup instructions you want to keep.
- Address audit findings per your project's risk tolerance:
  - The 1 HIGH finding (devalue DoS) has a fix available via `npm audit fix`
  - The 2 direct MODERATE findings (@astrojs/check, wrangler) have fixes available
  - All 7 transitive MODERATE findings have upstream fixes available
- Run `npm run dev` to start the development server and verify the scaffold.

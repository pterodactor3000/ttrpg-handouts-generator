---
project: ttrpg-handouts-generator
researched_at: 2026-05-24
recommended_platform: Cloudflare Workers + Pages
runner_up: Netlify
context_type: mvp
tech_stack:
  language: JavaScript/TypeScript
  framework: Astro 6 SSR
  runtime: Cloudflare Workers (workerd)
---

## Recommendation

**Deploy on Cloudflare Workers + Pages.**

This platform scores 5/5 on agent-friendly criteria, costs $0 at MVP scale (100k requests/day free tier), matches the deployment target already specified in `tech-stack.md`, and you're already comfortable with it. The `@astrojs/cloudflare` adapter is installed and configured. Native MCP support (GA) via Cloudflare Agents SDK enables agent-driven operations. Full CLI tooling (`wrangler deploy/rollback/tail`) supports autonomous deployment workflows.

## Platform Comparison

### Scoring Matrix

| Platform       | CLI-first | Managed/Serverless | Agent Docs | Stable Deploy | MCP       | Cost (100k/mo) | Total |
| -------------- | --------- | ------------------ | ---------- | ------------- | --------- | -------------- | ----- |
| **Cloudflare** | Pass      | Pass               | Pass       | Pass          | Pass (GA) | $0             | 5/5   |
| **Netlify**    | Partial¹  | Pass               | Pass       | Pass          | Pass (GA) | $0             | 4.5/5 |
| **Vercel**     | Pass      | Pass               | Pass       | Pass          | Partial²  | $0             | 4.5/5 |
| **Render**     | Partial³  | Pass               | Pass       | Pass          | Pass (GA) | $0⁴            | 4.5/5 |
| **Railway**    | Partial⁵  | Pass               | Pass       | Pass          | Pass (GA) | ~$10           | 4.5/5 |
| **Fly.io**     | Partial⁶  | Pass               | Fail⁷      | Pass          | Partial⁸  | ~$5            | 3/5   |

**Notes:**

1. Netlify: rollback is UI-only (not CLI)
2. Vercel: MCP server in Public Beta, read-only tools only
3. Render: rollback via API, not dedicated CLI command
4. Render: free tier but Postgres expires after 30 days (mitigated by external Supabase)
5. Railway: rollback is dashboard-only
6. Fly.io: rollback requires manual image hash selection
7. Fly.io: no llms.txt endpoint (docs on GitHub but not agent-optimized)
8. Fly.io: MCP support marked experimental

### Shortlisted Platforms

#### 1. Cloudflare Workers + Pages (Recommended)

**Why it won**: Perfect agent-friendly score (5/5), zero cost at MVP scale, native MCP integration (GA), and you're already familiar with the platform. The `@astrojs/cloudflare` adapter is installed and production-ready. Free tier provides 100k requests/day (resets midnight UTC), which comfortably covers small-scale MVP traffic. Full CLI tooling (`wrangler deploy`, `wrangler rollback`, `wrangler tail`) enables autonomous deployment workflows. Documentation available as `llms.txt` and markdown via GitHub. Co-located services (R2 for storage, D1 for caching, Workers KV) are GA and free-tier-friendly. Static assets are free and unlimited.

**Key strengths**:

- Zero vendor switching cost (already in tech-stack.md)
- Cloudflare's edge network provides global CDN out of the box (even though single-region deployment is fine per your interview answer, free global distribution is a bonus)
- Workerd runtime in local dev (`wrangler dev`) provides production parity, reducing "works on my machine" issues
- Supabase (already in stack) works well with Cloudflare via `@supabase/ssr`
- GitHub Actions CI template ships with the Astro starter

#### 2. Netlify

**Why it scored second**: Strong agent-friendly platform (4.5/5) with official MCP server (GA), zero cost for MVP traffic (300 credits/month, 100k requests = 2 credits), and excellent documentation (llms.txt + netlify-development.mdc context files). Astro 6 SSR works "on day one" via `@astrojs/netlify` adapter. CLI provides `netlify deploy` and `netlify logs` with streaming. Co-located Netlify Blobs (object storage, GA) and Forms (GA) simplify MVP infrastructure.

**Gap vs. recommendation**: Rollback is UI-only (cannot `netlify rollback` from CLI or agent). Some Astro 6 gotchas around `import.meta.env` vs `process.env` for runtime secrets — Netlify's smart secret scanning fails builds if you inline secrets at build time. Free tier has a hard 300-credit/month limit (no auto-recharge); 100k requests = 2 credits, so well within MVP scope, but you'd need to monitor credit usage. Switching from `@astrojs/cloudflare` to `@astrojs/netlify` adapter adds migration overhead (not significant, but non-zero).

#### 3. Vercel

**Why it scored third**: Excellent DX (4.5/5), zero cost for MVP (1M function invocations free, 100GB bandwidth), strong CLI (`vercel deploy`, `vercel rollback`, `vercel logs`), and Astro 6 SSR support from day one. Documentation is agent-optimized (llms.txt + markdown endpoints). Vercel Blob (GA) for object storage and Edge Config (GA) for feature flags are well-suited to MVP needs.

**Gap vs. recommendation**: MCP server is Public Beta (not GA) with read-only tools only (write operations in roadmap). Switching from `@astrojs/cloudflare` to `@astrojs/vercel` adapter required. Native Vercel Postgres/KV were deprecated in Dec 2024; you'd use Marketplace integrations (Neon, Supabase, Upstash) instead, which works but adds external dependencies. Free Hobby tier pauses projects if limits exceeded (1M invocations, 100GB transfer), though MVP traffic should stay well under these limits.

## Anti-Bias Cross-Check: Cloudflare Workers + Pages

### Devil's Advocate — Weaknesses

1. **Workerd prerendering breaks Node-native modules**: If you prerender pages that use `sharp`, `satori`, or any native Node module, builds will fail unless you set `prerenderEnvironment: 'node'` in the adapter config. This escape hatch introduces edge cases (catch-all prerendered routes + actions = HTTP 500 in dev, fixed in Astro 6.3.2+). Your PRD doesn't call for heavy image processing, but if you add OG image generation later, this becomes a blocker.

2. **Environment variable handling is non-standard**: Cloudflare Environments (`wrangler.jsonc` env sections) aren't merged into build output. You must set `CLOUDFLARE_ENV=<env>` at build time, then deploy without `--env` flag. This means separate builds per environment (dev/staging/prod), not separate deploys from one build. Adds CI complexity if you need multiple environments.

3. **Code deploys restart Durable Objects**: If you later add WebSockets or persistent state (outside MVP scope per PRD), every `wrangler deploy` disconnects all active Durable Object connections. Players viewing handouts via read-only links won't be affected (stateless), but if you add collaborative editing or live notifications, this becomes a production risk.

4. **Vendor lock-in to workerd runtime**: Your code runs in Cloudflare's `workerd` (not Node.js). If you need to migrate to a Node-based platform later (Fly.io, Railway, Render), you'll need to refactor or swap adapters. The Astro abstraction mitigates this somewhat, but any Cloudflare-specific APIs (D1, R2, Durable Objects) create migration friction.

5. **Free tier resets daily, not monthly**: 100k requests/day free tier resets at midnight UTC. If your traffic is bursty (e.g., all your players hit the app Sunday evening), you could exceed the daily limit even if monthly traffic is low. Paid tier is $5/month for 10M requests, but this violates your "minimize cost" priority if avoidable.

### Pre-Mortem — How This Could Fail

The team deployed Astro 6 SSR to Cloudflare Pages in week 1 of the 3-week MVP sprint. Everything worked in local dev (`wrangler dev` with workerd runtime parity). By week 2, the GM wanted to add OG image generation for handout link previews (social sharing). The developer added `@vercel/og` (which uses `satori` under the hood), prerendered the `/handouts/[id]/og.png` route, and hit a build failure: `satori` requires dynamic WebAssembly, which workerd doesn't support during prerendering.

The developer tried the `prerenderEnvironment: 'node'` escape hatch, which fixed the build but introduced a new bug: catch-all prerendered routes (`[...slug]`) with Astro Actions returned HTTP 500 in dev mode. The developer upgraded to Astro 6.3.2 (where this was fixed), but CI now ran two separate builds — one with `CLOUDFLARE_ENV=production` and one with `CLOUDFLARE_ENV=preview` — doubling build time and complicating the GitHub Actions workflow.

By week 3, the GM wanted to test the app with a staging environment before launching. The developer discovered that Cloudflare Environments don't work the way other platforms do: you can't deploy one build artifact to multiple environments. They had to set up separate `wrangler.toml` files, separate Supabase projects (staging DB), and separate CI jobs. The "simple deploy" became a multi-stage pipeline, eating into the MVP timeline. The app shipped on time, but technical debt accumulated around environment management.

Six months later, the GM wanted to migrate to a cheaper platform after Cloudflare changed pricing tiers. The app used Cloudflare D1 for caching and R2 for background image storage (added post-MVP). Migrating to Railway required rewriting all D1 queries to Postgres and swapping R2 calls for S3-compatible storage. The migration took 2 weeks instead of the planned 3 days.

### Unknown Unknowns

1. **Cloudflare outages are rare but global**: Cloudflare's edge network is a single point of failure. When Cloudflare goes down (most recently: June 2022 global outage, July 2024 routing issue), your entire app is unreachable. Other platforms (Vercel, Netlify, Render) have region-specific failures, so you might lose one region but keep others. Your PRD says "single region is fine," but a global outage is different from a regional one.

2. **Wrangler versioning can break CI**: `wrangler` is a moving target. Major version bumps (e.g., v3 → v4) have historically broken CI pipelines due to changed CLI syntax or deprecated commands. Pin `wrangler` in `package.json` and test upgrades in a branch before merging. The Astro adapter sometimes lags behind wrangler releases, causing compatibility mismatches.

3. **Free tier "100k requests/day" counts all requests, including static assets**: Even though static assets are "free and unlimited" on the pricing page, they still count toward your 100k request/day limit if served through Workers. If your handout backgrounds are served as static assets and you have 50k handout views/day, that's 150k requests (50k HTML + 100k images), exceeding the free tier. Solution: serve images from R2 with a custom domain (bypasses Workers request count) or use an external CDN.

4. **Supabase + Cloudflare Workers have cold-start connection issues**: Supabase Postgres over TCP doesn't work from Workers (no raw TCP sockets). You're using `@supabase/ssr` which handles this via HTTP, but if you later switch to direct Postgres queries (e.g., for performance), you'll need Supabase's HTTP-based connection pooler (Supavisor) or a third-party proxy. This isn't documented prominently in either platform's guides.

5. **Astro 6 adapter for Cloudflare is maintained by Astro core, not Cloudflare**: When Cloudflare releases new features (e.g., Durable Objects SQLite API, new Workers limits), the Astro adapter lags behind. If you need cutting-edge Cloudflare features, you'll wait for Astro to ship adapter updates or fork the adapter yourself.

## Operational Story

How Cloudflare Workers + Pages actually operates day to day:

- **Preview deploys**: Every push to a GitHub PR creates a preview deployment at `https://<commit-hash>.<project>.pages.dev`. Previews are public by default; protect them with Cloudflare Access if the app contains sensitive data (not needed for MVP per PRD — handouts are private until explicitly shared, and shared links are unguessable UUIDs). Fork PRs from external contributors do not trigger preview builds (security constraint); maintainers must push fork branches to the main repo to trigger previews.

- **Secrets**: Environment variables and secrets live in Cloudflare's dashboard (Workers & Pages > Settings > Environment Variables) or set via `wrangler secret put <NAME>`. Secrets are encrypted at rest and in transit. Only project members with "Edit" or "Admin" roles can read/write secrets; agents with project API tokens can write but not read (write-only secret management). Rotation: delete old secret, `wrangler secret put` with new value, redeploy (zero-downtime rotation).

- **Rollback**: `wrangler rollback [<deployment-id>]` reverts to any of the 100 most recent deployments. Rollback is instant (no rebuild). If `<deployment-id>` is omitted, rolls back to the previous deployment. Rollback does not revert Supabase database migrations (handle DB rollback separately). Typical time-to-revert: <30 seconds (issue command, wait for deployment ID confirmation, verify via preview link).

- **Approval**: Deployments to production (pushes to `main` branch) are automatic via GitHub Actions if CI passes. No human approval gate by default. Agents may deploy unattended if CI secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are available. Rotating primary secrets (Supabase keys, OAuth secrets) requires manual `wrangler secret put` or dashboard update — agents should not rotate these without explicit approval. Dropping a database table is a Supabase operation (not Cloudflare), handled via `supabase db reset` or manual SQL; agents must not run destructive DB commands unattended.

- **Logs**: `wrangler tail [<worker-name>]` streams real-time logs (stdout, errors, exceptions) with filtering by `--status`, `--method`, `--search`, `--format json`. For historical logs (beyond live tail), use Cloudflare Dashboard > Workers & Pages > [Project] > Logs > Real-time Logs (past 24 hours) or integrate with Logpush (requires paid plan, sends logs to S3/GCS/R2/HTTP endpoint). Agents read logs via `wrangler tail --format json` piped to `jq` or similar for parsing. No MCP tool for log ingestion yet (as of May 2026); agents invoke `wrangler tail` via shell.

## Risk Register

| Risk                                                | Source           | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ---------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workerd prerendering breaks Node-native modules** | Devil's advocate | Medium     | Medium | Set `prerenderEnvironment: 'node'` in `@astrojs/cloudflare` config if prerendering pages with `sharp`, `satori`, or `node:fs`. Upgrade to Astro 6.3.2+ to avoid HTTP 500 errors with catch-all routes + actions.                                                                    |
| **Environment variable complexity**                 | Devil's advocate | Medium     | Low    | Document the `CLOUDFLARE_ENV` build-time requirement in README. If multiple environments needed, set up separate CI jobs per environment with explicit `CLOUDFLARE_ENV` values. Avoid `wrangler deploy --env` (doesn't work as expected with Astro).                                |
| **Vendor lock-in to workerd runtime**               | Devil's advocate | Low        | High   | Minimize use of Cloudflare-specific APIs (D1, Durable Objects) during MVP. Stick to portable abstractions (Supabase for DB, R2 for storage with S3-compatible clients). If migration becomes necessary, swap Astro adapter and refactor Cloudflare-specific code.                   |
| **Daily request limit (100k/day)**                  | Devil's advocate | Low        | Medium | Monitor daily request count via Cloudflare Dashboard. If traffic approaches 100k/day, either upgrade to paid plan ($5/month for 10M/month) or optimize static asset serving (move images to R2 with custom domain to bypass Workers request count).                                 |
| **Global outage risk**                              | Unknown unknowns | Very Low   | High   | Accept as inherent platform risk for MVP. Cloudflare outages are rare but global (no regional fallback). Post-MVP, consider multi-CDN strategy or keep a Netlify/Vercel deployment as a hot standby (requires DNS failover setup).                                                  |
| **Wrangler version mismatch with Astro adapter**    | Unknown unknowns | Medium     | Low    | Pin `wrangler` version in `package.json` (e.g., `"wrangler": "^3.104.0"`). Test `wrangler` upgrades in a feature branch before merging. Subscribe to Astro's `@astrojs/cloudflare` release notes to catch adapter updates.                                                          |
| **Static assets count toward request limit**        | Unknown unknowns | Medium     | Medium | Serve handout background images from Cloudflare R2 with a custom domain (e.g., `cdn.ttrpg-handouts.com`) to bypass Workers request counting. Use `<img src="https://cdn.ttrpg-handouts.com/backgrounds/grimdark.jpg">` instead of `/_astro/grimdark.*.jpg`.                         |
| **Supabase + Cloudflare TCP limitation**            | Unknown unknowns | Low        | Low    | Continue using `@supabase/ssr` (HTTP-based). If you need raw Postgres queries for performance, use Supabase's Supavisor connection pooler (HTTP mode) or a third-party proxy like PgBouncer deployed on Fly.io.                                                                     |
| **Astro adapter lags behind Cloudflare features**   | Unknown unknowns | Low        | Low    | Accept as trade-off for using a framework adapter. If cutting-edge Cloudflare features are needed (e.g., new Durable Objects APIs), wait for Astro adapter update or eject to custom Workers script (loses Astro DX).                                                               |
| **Code deploys restart Durable Objects**            | Devil's advocate | N/A        | N/A    | Not applicable to MVP (no Durable Objects in scope per PRD). If WebSockets or persistent state added post-MVP, implement graceful reconnection logic in client code (exponential backoff, session resumption).                                                                      |
| **Cloudflare Environments deployment complexity**   | Pre-mortem       | Medium     | Medium | For MVP, use a single environment (production). If staging needed, create a separate Cloudflare Pages project (`ttrpg-handouts-staging`) with separate GitHub branch (`staging`) and separate Supabase project. Avoid `wrangler.jsonc` env sections (they don't merge as expected). |

## Getting Started

Five concrete steps to deploy the existing Astro 6 project to Cloudflare Pages:

1. **Verify adapter installation**: Check that `@astrojs/cloudflare` adapter is installed and configured in `astro.config.mjs`. The starter already includes this (`deployment_target: cloudflare-pages` in `tech-stack.md`), so you should see `adapter: cloudflare()` and `output: "server"` in the config. If missing, run `npx astro add cloudflare`.

2. **Install Wrangler CLI**: Run `npm install -g wrangler` (or `npm install --save-dev wrangler` for project-local install). Pin version in `package.json` to avoid CI breakage: `"wrangler": "^3.104.0"` (latest stable as of May 2026). Verify: `wrangler --version`.

3. **Authenticate Wrangler**: Run `wrangler login` to authenticate via OAuth (opens browser). This creates a local token at `~/.wrangler/config/default.toml`. For CI/CD, generate an API token at Cloudflare Dashboard > My Profile > API Tokens > Create Token (use "Edit Cloudflare Workers" template). Store token as `CLOUDFLARE_API_TOKEN` in GitHub Secrets. Also store `CLOUDFLARE_ACCOUNT_ID` (find in Dashboard URL: `dash.cloudflare.com/<account-id>`).

4. **Deploy manually (first time)**: Run `npm run build` to build the Astro app, then `wrangler pages deploy dist` to create a new Pages project. Wrangler will prompt for project name (use `ttrpg-handouts-generator`). The first deploy generates a `<project-name>.pages.dev` domain. Subsequent deploys update this project. Verify deployment: open the `*.pages.dev` URL in a browser.

5. **Configure CI/CD auto-deploy**: The GitHub Actions workflow (`.github/workflows/ci.yml`) already includes `npm run lint` + `npm run build`. Add a deployment step after build (only on `main` branch):

```yaml
- name: Deploy to Cloudflare Pages
  if: github.ref == 'refs/heads/main'
  run: npx wrangler pages deploy dist --project-name=ttrpg-handouts-generator
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Commit this change, push to `main`, and verify auto-deploy works. Future pushes to `main` will auto-deploy after CI passes.

**Supabase environment variables**: Set `SUPABASE_URL` and `SUPABASE_KEY` in Cloudflare Dashboard > Workers & Pages > [Project] > Settings > Environment Variables > Production. Do not commit these to `.env` (gitignored). For local dev, copy `.env.example` to `.dev.vars` (Cloudflare's local secret file, gitignored) and populate with Supabase credentials.

**Custom domain (optional)**: In Cloudflare Dashboard > Workers & Pages > [Project] > Custom Domains, add your domain (e.g., `ttrpg-handouts.com`). Cloudflare will auto-configure DNS if the domain is already in your Cloudflare account. SSL is automatic (Cloudflare Universal SSL).

## Out of Scope

The following were not evaluated in this research:

- **Docker image configuration**: Cloudflare Pages does not use Docker; it runs the Astro build output directly in workerd. No Dockerfile needed.
- **CI/CD pipeline setup**: The starter ships with GitHub Actions CI (lint + build). Deployment step shown in "Getting Started" above. Full pipeline design (staging environments, manual approval gates, rollback automation) is implementation-phase work.
- **Production-scale architecture**: This research optimizes for MVP (small user scale, 3-week timeline, after-hours development). Multi-region failover, high availability (HA), disaster recovery (DR), and CDN optimization for 100M+ requests/month are out of scope. Cloudflare's edge network provides global distribution by default, but architecting for true multi-region HA (e.g., active-active with regional databases) is a post-MVP concern.

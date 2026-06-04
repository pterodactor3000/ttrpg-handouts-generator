# Cloudflare Pages Integration Plan

## Deployment model

**Cloudflare Pages native GitHub integration** — Cloudflare clones the repo, runs `npm run build`, and deploys on every push to `main`. No GitHub Actions involved.

```
Push to main
  └─► Cloudflare Pages CI (builds + deploys automatically)

Push to PR branch
  └─► Cloudflare Pages preview deploy (automatic, *.pages.dev per commit)
```

> **Note on `wrangler.jsonc`**: The file stays in the repo for local development (`wrangler dev` workerd runtime parity). Cloudflare Pages does not use it for deployment — it uses its own build pipeline configured in the dashboard. The `"name"` field still needs renaming so `wrangler dev` and `wrangler tail` reference the right project locally.

---

## Code changes

### 1. Rename project in `wrangler.jsonc`

Change `"name"` from `"10x-astro-starter"` to `"ttrpg-handouts-generator"`.

```jsonc
{
  "name": "ttrpg-handouts-generator",
  ...
}
```

### 2. Create `.dev.vars.example`

Referenced in AGENTS.md but missing from the repo. Create alongside `.env.example`:

```bash
SUPABASE_URL=###
SUPABASE_KEY=###
```

Committed to repo; `.dev.vars` stays gitignored.

### 3. Upgrade Astro from 6.3.1 → latest 6.3.x

Risk register requires ≥6.3.2 (fixes HTTP 500 on catch-all routes + Actions). Run `npm update astro` and commit updated `package-lock.json`.

### 4. Delete `.github/workflows/ci.yml`

GitHub Actions is not used. Remove the file to avoid confusion and stale CI runs.

---

## Manual steps (one-time, requires Cloudflare + GitHub account access)

> Complete these in order — Supabase credentials are required by Cloudflare Pages before any build can succeed.

**M1 — Create Supabase account and project**

1. Sign up at [supabase.com](https://supabase.com) (free tier, no credit card required).
2. Create a new project: choose a name (e.g. `ttrpg-handouts`), set a strong database password, pick the region closest to your users.
3. Wait for the project to finish provisioning (~2 min).
4. Go to Project → Settings → API:
   - Copy **Project URL** → this is `SUPABASE_URL`
   - Copy **anon / public key** → this is `SUPABASE_KEY`
5. Store both values somewhere safe (password manager). You will paste them into Cloudflare Pages in the next steps.

> No migrations exist yet (`supabase/migrations/` is empty). When you add tables later, generate migrations with `npx supabase db diff --use-migra -f <name>` and apply with `npx supabase db push`.

**M2 — Create Cloudflare Pages project and connect GitHub**
Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git → select `ttrpg-handouts-generator` repo.

**M3 — Configure build settings in Cloudflare Pages wizard**

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (default)
- Branch to deploy: `main`

**M4 — Add Supabase credentials to Cloudflare Pages**
During setup wizard (or later: Pages project → Settings → Environment Variables → Production):

- `SUPABASE_URL` — type: Secret (encrypted)
- `SUPABASE_KEY` — type: Secret (encrypted)

**M5 — Trigger first auto-deploy**
Click "Save and Deploy" in the wizard, or push any small change to `main`. Cloudflare runs the build and assigns a `<project>.pages.dev` URL. Verify in browser.

---

## Edge cases with recovery steps

### E1: Pages build fails — missing env vars

**Symptom:** Cloudflare Pages build log shows `SUPABASE_URL is not set` or similar.
**Cause:** Supabase project not yet created (M1 not done), or secrets not yet added to Cloudflare Pages (M4 not done).
**Fix:** Complete M1 to get credentials, then add them under Pages project → Settings → Environment Variables → Production → Retry the deployment.

### E2: Pages build fails — Node version mismatch

**Symptom:** Build log shows incompatible Node.js version errors or `engines` mismatch.
**Cause:** Cloudflare Pages defaults to Node 18; project requires Node 22 (`.nvmrc`).
**Fix:** Pages project → Settings → Environment Variables → add `NODE_VERSION = 22` (plain text, not secret). Retry the deploy.

### E3: Preview deploys expose the app publicly before launch

**Symptom:** Every PR generates a public `*.pages.dev` preview URL.
**Cause:** Pages preview deployments are public by default.
**Fix:** Protect previews with Cloudflare Access (Pages project → Settings → Access Policy → Enable). Add a one-time PIN or email rule to restrict access to your team only. No cost for up to 50 users on the free tier.

### E4: Secrets not available at runtime (500 from Supabase client)

**Symptom:** App deploys but auth routes return 500; `wrangler tail` shows `SUPABASE_URL is undefined`.
**Cause:** Secrets set under "Preview" environment but not "Production", or set as plain text instead of encrypted.
**Fix:** Pages → Settings → Environment Variables → verify secrets exist under **Production** tab and are type **Secret**. Re-add if needed, then redeploy.

### E5: Rollback after a bad deploy

**Symptom:** Production is broken after a push to `main`.
**Fix (instant, no rebuild):** Pages project → Deployments → find previous successful deployment → three-dot menu → **Rollback to this deployment**. Or via CLI:

```bash
npx wrangler pages deployment list --project-name=ttrpg-handouts-generator
npx wrangler pages deployment rollback <deployment-id> --project-name=ttrpg-handouts-generator
```

Rollback takes <30s. Supabase DB migrations are NOT reverted — handle separately.

### E6: Project name conflict in Cloudflare Pages

**Symptom:** Pages wizard rejects `ttrpg-handouts-generator` as a name already taken (across all Cloudflare accounts, not just yours).
**Cause:** Pages project names are globally unique on `*.pages.dev`.
**Fix:** Use a variation: `ttrpg-handouts`, `ttrpg-handouts-app`, or your CF subdomain prefix. Update `wrangler.jsonc` `"name"` to match.

### E7: Wrangler version drift in local dev

**Symptom:** `wrangler dev` behavior diverges from what Cloudflare Pages runs in production.
**Cause:** `package.json` has `"wrangler": "^4.90.0"` — minor version updates may change runtime behavior.
**Fix:** After confirming stable local dev, pin to an exact version: `"wrangler": "4.90.0"`. Test minor upgrades in a feature branch before committing.

### E8: Astro 6.3.1 HTTP 500 on catch-all routes + Actions

**Symptom:** Dev or deployed app returns HTTP 500 on routes using both `[...slug]` and Astro Actions.
**Context:** Fixed in Astro 6.3.2+. Current version is 6.3.1.
**Fix:** Confirm step 3 (Astro upgrade) has been applied and `package.json` shows `astro ≥ 6.3.2`.

### E9: `prerenderEnvironment` blocker if OG images are added later

**Symptom:** Build fails with WebAssembly or `node:fs` error when prerendering a route using `satori`/`@vercel/og`.
**Fix:** Add to `astro.config.mjs`:

```javascript
adapter: cloudflare({ prerenderEnvironment: 'node' });
```

Requires Astro ≥6.3.2 to avoid the HTTP 500 regression this option re-introduces on older versions.

### E10: Supabase free project paused after inactivity

**Symptom:** Auth and API routes return 500; Supabase dashboard shows "Project paused".
**Cause:** Supabase free tier pauses projects inactive for >7 days (no database activity).
**Fix:** Log in to [supabase.com](https://supabase.com) → select project → click **Restore project** (takes ~2 min). To prevent: upgrade to Supabase Pro ($25/month) or keep the project active by scheduling a lightweight ping query (e.g., a cron job calling the Supabase REST API once daily).

### E11: Daily request limit (free tier)

**Symptom:** Dashboard shows request count nearing limits; some requests return 429.
**Context:** Cloudflare Pages free tier: 500 builds/month, unlimited requests. Static assets do NOT count toward a Workers request limit — this is less of a concern on Pages than on Workers.
**Fix (if dynamic SSR requests hit a limit):** Upgrade to Cloudflare Pages Pro ($20/month) or add cache headers to reduce SSR invocations for read-heavy handout pages.

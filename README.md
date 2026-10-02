# TTRPG Handouts Generator

Handouts Scriptorium is a tool for game masters. A GM writes a handout in markdown, previews it over a themed background, and shares a permanent link. Players open that link on any device without an account.

## Features

- Create, edit, and preview a handout before it is shared.
- Pick one of three themes: High Fantasy, Eldritch, or Grimdark. Each theme has its own background, border, font, and font color.
- Tag handouts. A crowded tag row shows `+N` and lists every tag in a dialog.
- Publish a permanent read-only link at `/share/<token>`.
- Filter the dashboard by Drafts, Published, or Archived.
- Archive a published handout without taking down its player link. Restore an archived handout to draft or published. A published restore keeps the existing token.
- Change the account password from Settings.
- Close an account. Sign-in stops immediately. Shared handouts stay available for 30 days, then a daily job deletes the account and its handouts.

Out of scope: custom background uploads, PDF or image export, and sign-in providers other than email and password.

## Tech stack

- Astro 6, server-rendered, deployed to Cloudflare Workers
- React 19 for interactive islands
- TypeScript 5
- Tailwind CSS 4
- Supabase Auth and Postgres
- Sentry for error reporting

## Prerequisites

- Node.js v22.14.0 (see `.nvmrc`)
- npm
- Docker, for the local Supabase stack

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Copy the env files:

```bash
cp .env.example .env
cp .env.example .dev.vars
```

3. Start local Supabase. `supabase/config.toml` is already in the repo.

```bash
npx supabase start
```

4. Fill `.env` and `.dev.vars` from `npx supabase status -o env`:

| App variable                | Status output      |
| --------------------------- | ------------------ |
| `SUPABASE_URL`              | `API_URL`          |
| `SUPABASE_KEY`              | `ANON_KEY`         |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |

5. Start the dev server:

```bash
npm run dev
```

Local Studio is at `http://localhost:54323`. Stop the stack with `npx supabase stop`.

Local auth does not require email confirmation (`enable_confirmations` is false in `supabase/config.toml`). On a hosted Supabase project, turn off **Authentication, Email, Confirm email** if you want the same behavior.

## Scripts

- `npm run dev` starts the Cloudflare workerd dev server
- `npm run build` builds the production Worker
- `npm run preview` serves the production build
- `npm run lint` runs type-checked ESLint
- `npm run lint:fix` applies ESLint fixes
- `npm run format` runs Prettier
- `npm test` runs unit and integration tests
- `npm run test:e2e` runs Playwright

## Tests

Unit tests need no services:

```bash
npm test -- --project unit
```

Integration tests need the local stack. Copy `.env.test.example` to `.env.test` and fill it from `npx supabase status -o env` (`SUPABASE_URL` from `API_URL`, `SUPABASE_ANON_KEY` from `ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from `SERVICE_ROLE_KEY`). Then:

```bash
npm test -- --project integration
```

GitHub Actions runs lint, unit tests, integration tests, and `e2e/player-share-link.spec.ts` on every push and pull request to `main`.

## Project structure

```text
src/pages/          Astro routes and API endpoints
src/components/     atoms, molecules, and organisms
src/layouts/        page shells
src/lib/            services and helpers
src/middleware.ts   auth gate for protected routes
supabase/migrations SQL migrations
__tests__/          Vitest unit and integration tests
e2e/                Playwright
context/foundation/ product requirements and roadmap
wrangler.jsonc      Cloudflare Workers config
```

## Environment

`SUPABASE_URL` and `SUPABASE_KEY` are server-only. The anon key is not sent to the browser.

| Variable                    | Required | Use                                                               |
| --------------------------- | -------- | ----------------------------------------------------------------- |
| `SUPABASE_URL`              | yes      | Supabase project URL                                              |
| `SUPABASE_KEY`              | yes      | Anon key for the SSR auth client                                  |
| `SUPABASE_SERVICE_ROLE_KEY` | yes      | Account deletion, closed-account sign-in check, and the purge job |
| `PUBLIC_SENTRY_DSN`         | no       | Browser and server error reporting                                |
| `SENTRY_ORG`                | no       | Source map upload at build time                                   |
| `SENTRY_PROJECT`            | no       | Source map upload at build time                                   |
| `SENTRY_AUTH_TOKEN`         | no       | Source map upload at build time                                   |

## Routes

| Route                 | Who can open it                                      |
| --------------------- | ---------------------------------------------------- |
| `/`                   | Anyone. Landing page.                                |
| `/auth/signin`        | Anyone. Email and password sign-in.                  |
| `/auth/signup`        | Anyone. Email and password sign-up.                  |
| `/auth/confirm-email` | Anyone. Shown after sign-up when confirmation is on. |
| `/dashboard`          | Signed-in GM.                                        |
| `/handouts/new`       | Signed-in GM.                                        |
| `/handouts/<id>/edit` | Signed-in GM who owns the handout.                   |
| `/settings`           | Signed-in GM. Password change and account deletion.  |
| `/account-closed`     | Anyone. Shown after a successful deletion.           |
| `/share/<token>`      | Anyone with the token. Read-only.                    |

`src/middleware.ts` protects `/dashboard`, `/handouts`, and `/settings`. A missing session redirects to `/auth/signin`.

## Deployment

The app deploys to Cloudflare Workers.

```bash
npm run build
npx wrangler deploy
```

Set `SUPABASE_URL`, `SUPABASE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` with `npx wrangler secret put` or in the Cloudflare dashboard. `wrangler.jsonc` schedules the purge job daily at 03:00 UTC. Cloudflare Pages builds and deploys on merge. GitHub Actions only runs the test workflow.

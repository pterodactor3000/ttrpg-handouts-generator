# Repository Guidelines

A TTRPG handouts generator built with Astro 6 (SSR), React 19, TypeScript 5, Tailwind 4, and Supabase auth, deployed to Cloudflare Workers. Supports markdown handouts over themed backgrounds with link-based sharing.

## Hard Rules

- **API routes** must export `const prerender = false` (Astro SSR requirement)
- **Never concatenate Tailwind classes** manually — use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge)
- **Supabase migrations** must use `YYYYMMDDHHmmss_short_description.sql` naming and enable RLS with per-operation policies on every new table
- **No Next.js directives** ("use client", "use server") in React components — this is Astro, not Next

## Build & Development Commands

- `npm run dev` — Cloudflare workerd dev server
- `npm run build` — SSR production build via `@astrojs/cloudflare`
- `npm run lint` — type-checked ESLint (blocks CI)
- `npm run lint:fix` — auto-fix linting issues
- `npm run format` — Prettier with Astro + Tailwind plugins
- `npm run preview` — preview production build locally
- `npx supabase start` — start local Supabase stack (requires Docker)

Pre-commit hooks (husky + lint-staged) run `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Project Structure

- `src/components/` — Astro and React components; `ui/` for shadcn/ui (new-york variant)
- `src/pages/` — Astro pages; `api/` for API routes
- `src/layouts/` — Astro layout components
- `src/lib/` — services and utilities; `lib/supabase.ts` for SSR client
- `src/middleware.ts` — auth gate (redirects unauthenticated users from `PROTECTED_ROUTES`)
- `supabase/migrations/` — timestamped SQL migration files
- `context/foundation/` — PRD and architecture decisions

Path alias: `@/*` maps to `./src/*` (tsconfig).

## Coding Conventions

- **Astro components** for static content/layout; **React** only when interactivity needed
- **shadcn/ui**: install with `npx shadcn@latest add [component-name]`; components land in `src/components/ui/`
- **API routes**: uppercase `GET`/`POST` exports, validate input with zod
- **React hooks**: extract to `src/components/hooks/`
- **Shared types**: place in `src/types.ts`
- TypeScript strict mode enforced; ESLint fails on unused vars (except `_`-prefixed)

## Commit & CI

- **Issue/PR title prefix**: GitHub issues, Linear issues, and PR titles MUST start with `// [<Roadmap ID>]::[<change id>] //` (e.g. `// [S-01]::[first-handout-creation-and-sharing] // feat: ...`). Roadmap ID and change id come from `context/foundation/roadmap.md`.
- **Commit style**: Conventional Commits (`chore:`, `feature:`, `refactor:`, `fix:`)
- **CI gate** (`.github/workflows/ci.yml`): runs `npm run lint` + `npm run build` on push/PR to `master`
- **CI secrets required**: `SUPABASE_URL`, `SUPABASE_KEY` (set in GitHub repo secrets)

## Environment

- Node.js v22.14.0 (see `.nvmrc`)
- **Local dev secrets**: copy `.env.example` to `.dev.vars` (for Cloudflare) and `.env` (for Node)
- **Required env vars**: `SUPABASE_URL`, `SUPABASE_KEY` (server-only via `astro:env/server`)
- **Deploy**: `npx wrangler deploy` (requires Cloudflare account + auth)

For architecture details, auth flow, and local Supabase setup, see @README.md and @CLAUDE.md.

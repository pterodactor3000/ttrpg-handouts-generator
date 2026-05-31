# Repository Guidelines

`src/` holds the Astro 6 SSR app: `components/`, `layouts/`, `pages/`, `lib/`, `styles/`, plus `middleware.ts`, `types.ts`, `env.d.ts`. See @AGENTS.md at the repo root for repo-wide rules.

## Atomic design (required)

Organize every new UI unit by atomic tier (`components/atoms/`, `components/molecules/`, `components/organisms/`), not by feature:

- **atoms** — primitives with no app logic, e.g. `@./components/atoms/button.tsx`, `@./components/atoms/LibBadge.astro`.
- **molecules** — small composed inputs, e.g. `@./components/molecules/FormField.tsx`, `@./components/molecules/TagsInput.tsx`.
- **organisms** — self-contained interactive sections, e.g. `@./components/organisms/SignInForm.tsx`, `@./components/organisms/HandoutEditor.tsx`.
- **templates** — page shells in `@./layouts/Layout.astro`.
- **pages** — route entries in `@./pages/`.

Compose upward only: organisms import molecules import atoms. Never reach down a route into an organism's internals.

## Components

- **Naming**: PascalCase filenames (`HandoutEditor.tsx`, `FormField.tsx`). shadcn/ui atoms stay lowercase (`button.tsx`, `dialog.tsx`).
- **Exports**: organism islands `export default` (see `SignInForm.tsx`); atoms/molecules use named exports (see `FormField.tsx`).
- **Props**: typed via `interface Props`/`interface XProps` in `.tsx`; `Astro.props` in `.astro`.
- **Classes**: merge with `cn()` from `@/lib/utils` — never concatenate strings. Import siblings via the `@/*` alias.
- **Mounting**: React islands attach in `.astro` pages with a `client:*` directive (`<HandoutEditor client:load />`). No `"use client"`.

## API & tests

Routes in `pages/api/` export `const prerender = false`, use uppercase `GET`/`POST`, and validate bodies with zod (`pages/api/handouts/index.ts`). Tests are colocated under `__tests__/` and run with `npm run test`.

Every component ships with unit tests when realistic — cover prop variants, conditional rendering, and user interactions (see `lib/__tests__/handout-renderer.test.ts` for the vitest pattern). Omit tests only when they are not realistic (e.g. pure-presentational atoms with no logic); note the reason in the PR.

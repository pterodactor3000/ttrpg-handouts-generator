# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Never Abbreviate Variable or Function Names

- **Context**: all code
- **Problem**: variables can be named in short forms, and that can cause confusion if the variable does not specify what it does with its name
- **Rule**: never abbreviate variable or function names. the code should be understandable without additional context
- **Applies to**: all

## Always Do Exports at the End of the Files

- **Context**: React components
- **Problem**: all exports across all components are in one place, no need to search the file to look for exports, even if there is one
- **Rule**: always do exports at the end of the files
- **Applies to**: all

## Always Use @ Aliases for Project Imports in TypeScript Files

- **Context**: all TypeScript (and TSX) files
- **Problem**: using relative paths (e.g. `../../types`) instead of the project `@/*` alias makes imports fragile to refactoring and inconsistent across the codebase. It also requires any tooling that resolves modules (e.g. vitest) to be kept in sync with tsconfig paths.
- **Rule**: always use the `@/` alias when importing from project source (e.g. `import type { Handout } from '@/types'`). Relative imports are only acceptable within the same directory for co-located modules.
- **Applies to**: all

## Follow Atomic Design Methodology for UI Components

- **Context**: Any phase that adds or modifies UI components (`src/components/`)
- **Problem**: Without a clear granularity model, components grow monolithic and become hard to test, reuse, and reason about in isolation.
- **Rule**: When developing new UI components, follow Atomic Design methodology — organize components as atoms, molecules, organisms, templates, and pages.
- **Applies to**: all

## Freeze unified Processor Singletons

- **Context**: any file that builds a `unified()` pipeline as a module-level constant
- **Problem**: a shared processor without `.freeze()` can be mutated by later `.use()` calls anywhere that has a reference to it, silently affecting all callers. unified auto-freezes on first run, but an explicit call makes the intent visible and surfaces accidental mutation as an immediate throw rather than a silent side-effect.
- **Rule**: always call `.freeze()` at the end of a module-level `unified()` chain to signal the pipeline is final and prevent accidental mutation.
- **Applies to**: all

## Always Assert Row Ownership at the Application Layer

- **Context**: any Supabase API route that updates or deletes a row by id
- **Problem**: filtering only by `id` (and optionally `status`) relies entirely on RLS for ownership enforcement. If RLS is absent, misconfigured, or bypassed during testing/migration, any authenticated user who knows a UUID can overwrite another user's data.
- **Rule**: always add `.eq('gm_id', user.id)` (or the relevant owner column) to UPDATE and DELETE queries in API routes, even when RLS enforces the same constraint. Defence in depth requires the application layer to assert ownership independently of the database layer.
- **Applies to**: all Supabase API routes performing UPDATE or DELETE

## TSX Test Files Require the React Plugin in vitest.config.ts

- **Context**: adding React component tests (.test.tsx) to a vitest project
- **Problem**: vitest.config.ts had `environment: 'node'` and no plugins. A new .test.tsx file caused a transform error because vitest cannot compile JSX without the React plugin, even though @vitejs/plugin-react was already in node_modules (pulled in by @astrojs/react).
- **Rule**: when adding the first .test.tsx file, add `import react from '@vitejs/plugin-react'` and `plugins: [react()]` to vitest.config.ts. The plugin is available as a transitive dep of @astrojs/react and does not need to be installed separately.
- **Applies to**: all phases that introduce React component test files

## Never Expose Raw Database Error Messages to HTTP Clients

- **Context**: any API route that catches a Supabase / PostgREST error
- **Problem**: PostgREST error messages routinely contain table names, column names, constraint names, and query fragments. Forwarding them directly to the HTTP response leaks schema information useful to an attacker.
- **Rule**: always log the raw error server-side (`console.error('DB error:', error)`) and return a generic, user-facing message (e.g. `'Failed to save handout'`) in the HTTP response body.
- **Applies to**: all API routes

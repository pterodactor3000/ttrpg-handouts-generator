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

## Always Use Arrow Functions with Const Declarations

- **Context**: all TypeScript files
- **Problem**: use constants to declare functions and arrow function declarations, so the code is better understandable
- **Rule**: always use arrow functions with const declarations for functions, instead of keyword 'function'
- **Applies to**: all

## Follow Atomic Design Methodology for UI Components

- **Context**: Any phase that adds or modifies UI components (`src/components/`)
- **Problem**: Without a clear granularity model, components grow monolithic and become hard to test, reuse, and reason about in isolation.
- **Rule**: When developing new UI components, follow Atomic Design methodology — organize components as atoms, molecules, organisms, templates, and pages.
- **Applies to**: all
